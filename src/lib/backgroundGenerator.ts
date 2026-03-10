/**
 * Background Generation Manager
 * Continues generation even when user navigates away from the page.
 * Uses a module-level singleton so it persists across React renders.
 */

import {
  scrapeCompanyBranding,
  analyzeCompany,
  saveJobApplication,
  searchCompanyIcon,
} from "@/lib/api/jobApplication";
import { scrapeJob, streamTailoredLetter } from "@/lib/api/coverLetter";
import { getProfileContextForPrompt } from "@/lib/api/profile";
import { streamResumeGeneration, getResumeStyle } from "@/lib/api/resume";
import { cleanHtml } from "@/lib/cleanHtml";
import {
  streamDynamicAssetGeneration,
  updateGeneratedAsset,
  saveDynamicAssetRevision,
} from "@/lib/api/dynamicAssets";
import { supabase } from "@/integrations/supabase/client";

export type GenerationJob = {
  applicationId: string;
  status: "pending" | "scraping" | "analyzing" | "resume" | "cover-letter" | "generating-asset" | "refining-asset" | "complete" | "error";
  progress: string;
  error?: string;
  /** Tracks how many of the parallel assets have finished (used by UI) */
  parallelCompleted?: number;
  parallelTotal?: number;
  /** Timestamp when the job started */
  startedAt?: number;
  /** Timestamp when each stage started */
  stageStartedAt?: number;
  /** For asset-specific background jobs */
  assetType?: string;
  jobLabel?: string;
};

export type AssetJobResult = { html: string; extraFields?: Record<string, any> };

type Listener = () => void;

class BackgroundGenerationManager {
  private jobs: Map<string, GenerationJob> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private listeners: Set<Listener> = new Set();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Auto-cleanup completed/errored jobs after 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupStaleJobs(), 60_000);
  }

  /** Remove completed/errored jobs older than 5 minutes, reset orphaned generating jobs older than 10 minutes */
  private cleanupStaleJobs() {
    const now = Date.now();
    for (const [key, job] of this.jobs.entries()) {
      if (!job.startedAt) continue;
      const age = now - job.startedAt;
      if (["complete", "error"].includes(job.status) && age > 5 * 60_000) {
        this.jobs.delete(key);
      } else if (!["complete", "error"].includes(job.status) && age > 10 * 60_000) {
        // Orphaned generating job — mark as error
        job.status = "error";
        job.error = "Generation timed out (orphaned job)";
        job.progress = "Timed out";
        this.abortControllers.get(key)?.abort();
        this.abortControllers.delete(key);
      }
    }
    if (this.jobs.size > 0) this.notify();
  }

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
      // Track stage transitions with timestamps
      if (updates.status && updates.status !== job.status) {
        updates.stageStartedAt = Date.now();
      }
      Object.assign(job, updates);
      this.notify();
    }
  }

  /**
   * Cancel an active generation job.
   */
  cancelJob(id: string) {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort(new Error("Cancelled by user"));
      this.abortControllers.delete(id);
    }
    this.updateJob(id, { status: "error", progress: "Cancelled", error: "Generation cancelled by user" });
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
    resumeStyleId,
    sourceResumeId,
  }: {
    applicationId?: string;
    jobUrl: string;
    companyUrl?: string;
    jobDescription?: string;
    useManualInput?: boolean;
    resumeStyleId?: string;
    sourceResumeId?: string;
  }): Promise<string> {
    // Create a DB record first if we don't have one
    let appId = applicationId;
    if (!appId) {
      const saved = await saveJobApplication({
        job_url: jobUrl,
        company_url: companyUrl,
        status: "generating",
        generation_status: "pending",
      });
      appId = saved.id;
    } else {
      await saveJobApplication({
        id: appId,
        job_url: jobUrl,
        status: "generating",
        generation_status: "pending",
      });
    }

    const now = Date.now();
    const job: GenerationJob = {
      applicationId: appId,
      status: "pending",
      progress: "Starting...",
      startedAt: now,
      stageStartedAt: now,
    };
    this.jobs.set(appId, job);
    const abortController = new AbortController();
    this.abortControllers.set(appId, abortController);
    this.notify();

    // Run in background (don't await at call site)
    this.runPipeline(appId, jobUrl, companyUrl, jobDescription, useManualInput, resumeStyleId, sourceResumeId, abortController.signal);

    return appId;
  }

  private async runPipeline(
    appId: string,
    jobUrl: string,
    companyUrl?: string,
    manualDescription?: string,
    useManualInput?: boolean,
    resumeStyleId?: string,
    sourceResumeId?: string,
    signal?: AbortSignal,
  ) {
    try {
      // 0. Load user profile context for AI personalization
      const profileContext = await getProfileContextForPrompt();

      // 1. Scrape job
      let markdown = manualDescription || "";
      if (!useManualInput && jobUrl) {
        this.updateJob(appId, { status: "scraping", progress: "Scraping job posting..." });
        await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "scraping" });
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
      await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "analyzing" });
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

      // 3b. Search for company icon (always try external search first for best quality)
      let companyIconUrl: string | null = null;
      if (companyName) {
        this.updateJob(appId, { progress: "Searching for company logo..." });
        try {
          const { iconUrl, source } = await searchCompanyIcon(companyName, companyUrl);
          if (iconUrl) {
            console.log(`Company icon found via ${source}: ${iconUrl}`);
            companyIconUrl = iconUrl;
          }
        } catch (e) {
          console.warn("Company icon search failed:", e);
        }
      }
      // Fallback: use logo from branding scrape if icon search found nothing
      if (!companyIconUrl) {
        companyIconUrl = brandingData?.logo || brandingData?.images?.logo || brandingData?.images?.favicon || null;
      }
      // Inject icon into branding for template usage
      if (companyIconUrl && brandingData) {
        if (!brandingData.logo) brandingData.logo = companyIconUrl;
      } else if (companyIconUrl && !brandingData) {
        brandingData = { logo: companyIconUrl };
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
        generation_status: "cover-letter",
        company_icon_url: companyIconUrl,
        ...(sourceResumeId ? { source_resume_id: sourceResumeId } : {}),
      });

      // 4. Generate resume
      this.updateJob(appId, { status: "resume", progress: "Generating resume..." });
      await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "resume" });
      let resumeHtml: string | null = null;
      try {
        let systemPrompt: string | undefined;
        if (resumeStyleId) {
          try {
            const style = await getResumeStyle(resumeStyleId);
            systemPrompt = style.system_prompt;
          } catch (e) {
            console.warn("Failed to fetch resume style, using default:", e);
          }
        }

        const { getActiveResumeText } = await import("@/lib/api/profile");
        let resumeText = "";
        try {
          resumeText = await getActiveResumeText();
        } catch (e) {
          console.warn("Failed to fetch profile for resume:", e);
        }

        let accumulated = "";
        await streamResumeGeneration({
          jobDescription: markdown,
          resumeText,
          systemPrompt,
          companyName,
          jobTitle,
          branding: brandingData,
          competitors,
          customers,
          products,
          profileContext,
          onDelta: (text) => { accumulated += text; },
          onDone: () => {},
        });
        resumeHtml = cleanHtml(accumulated);
      } catch (e) {
        console.warn("Resume generation failed:", e);
      }

      // 5. Generate cover letter
      this.updateJob(appId, { status: "cover-letter", progress: "Generating cover letter..." });
      await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "cover-letter" });
      let coverLetter = "";
      await streamTailoredLetter({
        jobDescription: markdown,
        profileContext,
        onDelta: (text) => { coverLetter += text; },
        onDone: () => {},
      });

      // 6a. Save resume immediately so it appears in the UI right away
      if (resumeHtml) {
        await saveJobApplication({
          id: appId,
          job_url: jobUrl,
          resume_html: resumeHtml,
        });
      }

      // 6b. Save cover letter and mark complete
      await saveJobApplication({
        id: appId,
        job_url: jobUrl,
        cover_letter: coverLetter,
        status: "complete",
        generation_status: "complete",
      });

      this.abortControllers.delete(appId);
      this.updateJob(appId, { status: "complete", progress: "Done!" });
    } catch (err: unknown) {
      this.abortControllers.delete(appId);
      const isCancelled = signal?.aborted;
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      if (isCancelled) {
        // Already handled by cancelJob — just save the status
      } else {
        console.error("Background generation error:", err);
        this.updateJob(appId, { status: "error", progress: "Failed", error: errMsg });
      }
      try {
        await saveJobApplication({
          id: appId,
          job_url: jobUrl,
          status: "error",
          generation_status: "error",
          generation_error: errMsg,
        });
      } catch (saveErr) { console.warn("Failed to save error status:", saveErr); }
    }
  }


  // --- Generic asset job support (keyed as appId::assetType) ---

  private assetJobKey(appId: string, assetType: string): string {
    return `${appId}::${assetType}`;
  }

  getAssetJob(appId: string, assetType: string): GenerationJob | undefined {
    return this.jobs.get(this.assetJobKey(appId, assetType));
  }

  /** Check if any job (pipeline or asset-specific) is active for a given application */
  hasActiveJobsForApp(appId: string): boolean {
    for (const [key, job] of this.jobs.entries()) {
      if ((key === appId || key.startsWith(`${appId}::`)) && !["complete", "error"].includes(job.status)) {
        return true;
      }
    }
    return false;
  }

  /** Get all active asset types for an application */
  getActiveAssetTypesForApp(appId: string): string[] {
    const types: string[] = [];
    for (const [key, job] of this.jobs.entries()) {
      if (key.startsWith(`${appId}::`) && !["complete", "error"].includes(job.status)) {
        types.push(key.split("::")[1]);
      }
    }
    return types;
  }

  /**
   * Start a generic asset background job (generate or refine).
   * runFn does the actual streaming work and returns the result.
   * The backgroundGenerator manages state and persists to DB.
   */
  async startAssetJob({
    applicationId,
    assetType,
    label,
    dbField,
    runFn,
    saveRevisionFn,
    revisionLabel,
  }: {
    applicationId: string;
    assetType: string;
    label: string;
    dbField: string;
    runFn: () => Promise<AssetJobResult>;
    saveRevisionFn?: (appId: string, html: string, label: string) => Promise<any>;
    revisionLabel?: string;
  }): Promise<void> {
    const jobKey = this.assetJobKey(applicationId, assetType);
    const now = Date.now();
    const job: GenerationJob = {
      applicationId,
      status: "generating-asset",
      progress: `${label}...`,
      assetType,
      jobLabel: label,
      startedAt: now,
      stageStartedAt: now,
    };
    this.jobs.set(jobKey, job);
    this.notify();

    // Run in background — don't await at call site
    this.runAssetJob(jobKey, applicationId, dbField, label, runFn, saveRevisionFn, revisionLabel);
  }

  private async runAssetJob(
    jobKey: string,
    appId: string,
    dbField: string,
    label: string,
    runFn: () => Promise<AssetJobResult>,
    saveRevisionFn?: (appId: string, html: string, label: string) => Promise<any>,
    revisionLabel?: string,
  ) {
    try {
      const result = await runFn();

      // Save to DB
      const savePayload: Record<string, any> = { [dbField]: result.html };
      if (result.extraFields) Object.assign(savePayload, result.extraFields);

      // Need job_url for saveJobApplication — fetch it
      const { getJobApplication } = await import("@/lib/api/jobApplication");
      const app = await getJobApplication(appId);
      await saveJobApplication({
        id: appId,
        job_url: app.job_url,
        ...savePayload,
      });

      // Save revision if provided
      if (saveRevisionFn && revisionLabel) {
        try {
          await saveRevisionFn(appId, result.html, revisionLabel);
        } catch (e) { console.warn("Failed to save revision:", e); }
      }

      this.updateJob(jobKey, { status: "complete", progress: `${label} complete!` });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`Background ${label} error:`, err);
      this.updateJob(jobKey, { status: "error", progress: `${label} failed`, error: errMsg });
    }
  }

}

// Singleton — persists across React navigations
export const backgroundGenerator = new BackgroundGenerationManager();
