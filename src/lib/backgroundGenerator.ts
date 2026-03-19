/**
 * Background Generation Manager
 * Continues generation even when user navigates away from the page.
 * Uses a module-level singleton so it persists across React renders.
 */

import {
  scrapeCompanyBranding,
  analyzeCompany,
  streamDashboardGeneration,
  saveJobApplication,
} from "@/lib/api/jobApplication";
import { scrapeJob, streamTailoredLetter } from "@/lib/api/coverLetter";
import { parseLlmJsonOutput, assembleDashboardHtml } from "@/lib/dashboard/assembler";
import { parseJobDescription } from "@/lib/api/jdIntelligence";
import type { JDIntelligence } from "@/lib/api/jdIntelligence";

export type GenerationJob = {
  applicationId: string;
  status: "pending" | "scraping" | "analyzing" | "cover-letter" | "dashboard" | "complete" | "error";
  progress: string;
  error?: string;
};

type Listener = () => void;

class BackgroundGenerationManager {
  private jobs: Map<string, GenerationJob> = new Map();
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getJob(id: string): GenerationJob | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): GenerationJob[] {
    return Array.from(this.jobs.values());
  }

  getActiveCount(): number {
    return Array.from(this.jobs.values()).filter(
      (j) => !["complete", "error"].includes(j.status)
    ).length;
  }

  private updateJob(id: string, updates: Partial<GenerationJob>) {
    const job = this.jobs.get(id);
    if (job) {
      Object.assign(job, updates);
      this.notify();
    }
  }

  /**
   * Start a full generation pipeline for a single application.
   * Runs entirely in the background — no UI dependency.
   */
  async startFullGeneration({
    applicationId,
    jobUrl,
    companyUrl,
    jobDescription,
    useManualInput,
  }: {
    applicationId?: string;
    jobUrl: string;
    companyUrl?: string;
    jobDescription?: string;
    useManualInput?: boolean;
  }): Promise<string> {
    // Create a DB record first if we don't have one
    let appId = applicationId;
    if (!appId) {
      const saved = await saveJobApplication({
        job_url: jobUrl,
        company_url: companyUrl,
        status: "generating",
        generation_status: "pending",
      } as any);
      appId = saved.id;
    } else {
      await saveJobApplication({
        id: appId,
        job_url: jobUrl,
        status: "generating",
        generation_status: "pending",
      } as any);
    }

    const job: GenerationJob = {
      applicationId: appId,
      status: "pending",
      progress: "Starting...",
    };
    this.jobs.set(appId, job);
    this.notify();

    // Run in background (don't await at call site)
    this.runPipeline(appId, jobUrl, companyUrl, jobDescription, useManualInput);

    return appId;
  }

  private async runPipeline(
    appId: string,
    jobUrl: string,
    companyUrl?: string,
    manualDescription?: string,
    useManualInput?: boolean
  ) {
    try {
      // 1. Scrape job
      let markdown = manualDescription || "";
      if (!useManualInput && jobUrl) {
        this.updateJob(appId, { status: "scraping", progress: "Scraping job posting..." });
        await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "scraping" } as any);
        const result = await scrapeJob(jobUrl);
        markdown = result.markdown;
      }
      this.updateJob(appId, { status: "scraping", progress: "Job description ready" });

      // 2. Scrape company branding
      let brandingData: any = null;
      let companyMarkdown = "";
      if (companyUrl?.trim()) {
        this.updateJob(appId, { progress: "Scraping company branding..." });
        try {
          const result = await scrapeCompanyBranding(companyUrl);
          brandingData = result.branding;
          companyMarkdown = result.markdown;
        } catch (e) {
          console.warn("Branding scrape failed:", e);
        }
      }

      // 3. Analyze company
      this.updateJob(appId, { status: "analyzing", progress: "Analyzing company & market..." });
      await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "analyzing" } as any);
      let companyName = "", jobTitle = "", department = "";
      let competitors: string[] = [], customers: string[] = [], products: string[] = [];
      try {
        const analysis = await analyzeCompany({
          companyMarkdown,
          jobDescription: markdown,
        });
        companyName = analysis.companyName || "";
        jobTitle = analysis.jobTitle || "";
        department = analysis.department || "";
        competitors = analysis.competitors || [];
        customers = analysis.customers || [];
        products = analysis.products || [];
      } catch (e) {
        console.warn("Analysis failed:", e);
      }

      // 3b. Parse JD intelligence (parallel-safe, non-blocking)
      let jdIntelligence: JDIntelligence | null = null;
      if (markdown && markdown.length >= 50) {
        this.updateJob(appId, { progress: "Parsing JD intelligence..." });
        try {
          jdIntelligence = await parseJobDescription({ jobDescriptionMarkdown: markdown, companyName });
        } catch (e) {
          console.warn("JD intelligence parse failed:", e);
        }
      }

      // Save intermediate results
      await saveJobApplication({
        id: appId,
        job_url: jobUrl,
        company_url: companyUrl,
        company_name: companyName,
        job_title: jobTitle,
        job_description_markdown: markdown,
        branding: brandingData,
        competitors,
        customers,
        products,
        jd_intelligence: jdIntelligence,
        generation_status: "cover-letter",
      } as any);

      // 4. Generate cover letter
      this.updateJob(appId, { status: "cover-letter", progress: "Generating cover letter..." });
      let coverLetter = "";
      await streamTailoredLetter({
        jobDescription: markdown,
        onDelta: (text) => { coverLetter += text; },
        onDone: () => {},
      });

      await saveJobApplication({
        id: appId,
        job_url: jobUrl,
        cover_letter: coverLetter,
        generation_status: "dashboard",
      } as any);

      // 5. Generate dashboard (now outputs JSON, assembled into HTML by templates)
      this.updateJob(appId, { status: "dashboard", progress: "Generating dashboard..." });
      let dashboardRaw = "";
      await streamDashboardGeneration({
        jobDescription: markdown,
        branding: brandingData,
        companyName,
        jobTitle,
        competitors,
        customers,
        products,
        department,
        onDelta: (text) => { dashboardRaw += text; },
        onDone: () => {},
      });

      // Parse JSON and assemble HTML from templates
      let dashboardHtml = "";
      let dashboardData: any = null;
      const parsed = parseLlmJsonOutput(dashboardRaw);
      if (parsed) {
        dashboardData = parsed;
        dashboardHtml = assembleDashboardHtml(parsed);
      } else {
        // Fallback: treat as raw HTML (backward compat with old prompt)
        console.warn("Failed to parse dashboard JSON, falling back to raw HTML");
        dashboardHtml = dashboardRaw;
        const htmlStart = dashboardHtml.indexOf("<!DOCTYPE html>") !== -1
          ? dashboardHtml.indexOf("<!DOCTYPE html>")
          : dashboardHtml.indexOf("<!doctype html>");
        if (htmlStart > 0) dashboardHtml = dashboardHtml.slice(htmlStart);
        const htmlEnd = dashboardHtml.lastIndexOf("</html>");
        if (htmlEnd !== -1) dashboardHtml = dashboardHtml.slice(0, htmlEnd + 7);
      }

      // 6. Save final result
      await saveJobApplication({
        id: appId,
        job_url: jobUrl,
        dashboard_html: dashboardHtml,
        dashboard_data: dashboardData,
        status: "complete",
        generation_status: "complete",
      } as any);

      this.updateJob(appId, { status: "complete", progress: "Done!" });
    } catch (err: any) {
      console.error("Background generation error:", err);
      this.updateJob(appId, { status: "error", progress: "Failed", error: err.message });
      try {
        await saveJobApplication({
          id: appId,
          job_url: jobUrl,
          status: "error",
          generation_status: "error",
          generation_error: err.message,
        } as any);
      } catch {}
    }
  }

  /**
   * Start a dashboard refinement in the background.
   * Continues even if the user navigates away.
   */
  async startRefinement({
    applicationId,
    currentHtml,
    currentDashboardData,
    userMessage,
    chatHistory,
    jobUrl,
  }: {
    applicationId: string;
    currentHtml: string;
    currentDashboardData?: any;
    userMessage: string;
    chatHistory: Array<{ role: string; content: string }>;
    jobUrl: string;
  }): Promise<void> {
    const job: GenerationJob = {
      applicationId,
      status: "dashboard",
      progress: "Refining dashboard...",
    };
    this.jobs.set(applicationId, job);
    this.notify();

    this.runRefinement(applicationId, currentHtml, currentDashboardData, userMessage, chatHistory, jobUrl);
  }

  private async runRefinement(
    appId: string,
    currentHtml: string,
    currentDashboardData: any | undefined,
    userMessage: string,
    chatHistory: Array<{ role: string; content: string }>,
    jobUrl: string,
  ) {
    try {
      const { streamDashboardRefinement } = await import("@/lib/api/jobApplication");

      let accumulated = "";
      await streamDashboardRefinement({
        currentHtml,
        currentDashboardData,
        userMessage,
        chatHistory,
        onDelta: (text) => { accumulated += text; },
        onDone: () => {
          // Try parsing as JSON first (new format)
          const parsed = parseLlmJsonOutput(accumulated);
          if (parsed) {
            accumulated = assembleDashboardHtml(parsed);
          } else {
            // Fallback: clean as raw HTML
            let clean = accumulated;
            const htmlStart = clean.indexOf("<!DOCTYPE html>");
            const htmlStartAlt = clean.indexOf("<!doctype html>");
            const start = htmlStart !== -1 ? htmlStart : htmlStartAlt;
            if (start > 0) clean = clean.slice(start);
            const htmlEnd = clean.lastIndexOf("</html>");
            if (htmlEnd !== -1) clean = clean.slice(0, htmlEnd + 7);
            accumulated = clean;
          }
        },
      });

      const updatedHistory = [...chatHistory, { role: "assistant", content: "✅ Dashboard updated!" }];
      await saveJobApplication({
        id: appId,
        job_url: jobUrl,
        dashboard_html: accumulated,
        chat_history: updatedHistory,
      } as any);

      this.updateJob(appId, { status: "complete", progress: "Refinement complete!" });
    } catch (err: any) {
      console.error("Background refinement error:", err);
      this.updateJob(appId, { status: "error", progress: "Refinement failed", error: err.message });
    }
  }
}

// Singleton — persists across React navigations
export const backgroundGenerator = new BackgroundGenerationManager();
