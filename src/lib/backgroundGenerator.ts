/**
 * Background Generation Manager
 * Continues generation even when user navigates away from the page.
 * Uses a module-level singleton so it persists across React renders.
 * 
 * Pipeline: Reviewing Job → Branding → Analyzing → Researching → Resume (foreground)
 *           → Cover Letter → Dashboard (background, after navigation)
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
import { generateOptimizedResume } from "@/lib/api/resumeGeneration";
import { supabase } from "@/integrations/supabase/client";
import type { JDIntelligence } from "@/lib/api/jdIntelligence";

export type GenerationJobStatus =
  | "pending"
  | "reviewing-job"
  | "branding"
  | "analyzing"
  | "research"
  | "resume"
  | "resume-complete"
  | "cover-letter"
  | "generating-materials"
  | "dashboard"
  | "complete"
  | "error";

export type GenerationJob = {
  applicationId: string;
  status: GenerationJobStatus;
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
   * Phase 1 (foreground): Scrape → Brand → Analyze → Research → Resume
   * Phase 2 (background): Cover Letter → Dashboard
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
      // 1. Scrape / review job
      let markdown = manualDescription || "";
      if (!useManualInput && jobUrl) {
        this.updateJob(appId, { status: "reviewing-job", progress: "Reviewing job posting..." });
        await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "reviewing-job" } as any);
        const result = await scrapeJob(jobUrl);
        markdown = result.markdown;
      }
      this.updateJob(appId, { status: "reviewing-job", progress: "Job description ready" });

      // 2. Scrape company branding
      let brandingData: any = null;
      let companyMarkdown = "";
      if (companyUrl?.trim()) {
        this.updateJob(appId, { status: "branding", progress: "Scraping company branding..." });
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

      // 4. Research
      this.updateJob(appId, { status: "research", progress: `Researching ${companyName || 'company'}...` });
      await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "research" } as any);
      let researchedSections: any[] | undefined;
      try {
        const { researchCompany } = await import("@/lib/api/researchCompany");
        const research = await researchCompany({
          jobUrl: jobUrl || undefined,
          companyUrl: companyUrl || undefined,
          jobTitle,
          companyName,
          department,
          jobDescription: markdown,
        });
        researchedSections = research.sections;
      } catch (e) {
        console.warn("Research failed:", e);
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
        generation_status: "resume",
      } as any);

      // 5. Generate resume (foreground phase end)
      this.updateJob(appId, { status: "resume", progress: "Generating tailored resume..." });
      
      // Fetch user's resume text and full name
      let resumeText = "";
      let candidateName = "";
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch profile for name
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, middle_name, last_name, resume_text")
            .eq("id", user.id)
            .single();
          
          if (profile) {
            candidateName = [profile.first_name, profile.middle_name, profile.last_name]
              .filter(Boolean).join(" ");
          }

          // Try user_resumes first (active resume with extracted text)
          const { data: activeResume } = await supabase
            .from("user_resumes")
            .select("resume_text")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (activeResume?.resume_text) {
            resumeText = activeResume.resume_text;
          } else {
            // Fallback to profiles.resume_text for backward compatibility
            resumeText = profile?.resume_text || "";
          }
        }
      } catch (e) {
        console.warn("Failed to fetch user resume text:", e);
      }

      if (resumeText && markdown) {
        try {
          const result = await generateOptimizedResume({
            jobDescription: markdown,
            resumeText,
            missingKeywords: [],
            companyName,
            jobTitle,
          });
          await saveJobApplication({
            id: appId,
            job_url: jobUrl,
            resume_html: result.resume_html,
            generation_status: "resume-complete",
            status: "resume-complete",
          } as any);
        } catch (e) {
          console.warn("Resume generation failed:", e);
          // Still mark as resume-complete so user can proceed
          await saveJobApplication({
            id: appId,
            job_url: jobUrl,
            generation_status: "resume-complete",
            status: "resume-complete",
          } as any);
        }
      } else {
        // No resume text available — skip resume generation
        await saveJobApplication({
          id: appId,
          job_url: jobUrl,
          generation_status: "resume-complete",
          status: "resume-complete",
        } as any);
      }

      // Signal foreground completion — user navigates to detail page now
      this.updateJob(appId, { status: "resume-complete", progress: "Resume ready! Generating remaining assets..." });

      // ========== Phase 2: Background (cover letter + dashboard) ==========

      // 6. Generate cover letter
      this.updateJob(appId, { status: "cover-letter", progress: "Generating cover letter..." });
      let coverLetter = "";
      try {
        await streamTailoredLetter({
          jobDescription: markdown,
          onDelta: (text) => { coverLetter += text; },
          onDone: () => {},
        });
        await saveJobApplication({
          id: appId,
          job_url: jobUrl,
          cover_letter: coverLetter,
          generation_status: "cover-letter-complete",
        } as any);
      } catch (e) {
        console.warn("Cover letter generation failed:", e);
      }

      // 7. Generate dynamic materials from JD-recommended assets
      const recommendedAssets = jdIntelligence?.recommended_assets || [];
      if (recommendedAssets.length > 0) {
        this.updateJob(appId, { status: "generating-materials", progress: `Generating materials (0/${recommendedAssets.length})...` });

        // Save proposed assets
        for (const asset of recommendedAssets) {
          try {
            await supabase.from("proposed_assets").upsert({
              application_id: appId,
              asset_name: asset.name,
              brief_description: asset.brief_description,
              selected: true,
            }, { onConflict: 'application_id,asset_name' }).select();
          } catch { /* non-critical */ }
        }

        // Generate each material with staggered starts
        for (let i = 0; i < recommendedAssets.length; i++) {
          const asset = recommendedAssets[i];
          this.updateJob(appId, {
            status: "generating-materials",
            progress: `Generating ${asset.name} (${i + 1}/${recommendedAssets.length})...`,
          });

          try {
            // Create placeholder in generated_assets
            const { data: assetRow } = await supabase.from("generated_assets").insert({
              application_id: appId,
              asset_name: asset.name,
              brief_description: asset.brief_description,
              generation_status: "generating",
            }).select().single();

            // Add timeout to prevent hanging on slow/unresponsive edge functions
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

            try {
              const resp = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-material`,
                {
                  method: 'POST',
                  signal: controller.signal,
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  },
                    body: JSON.stringify({
                    assetName: asset.name,
                    assetDescription: asset.brief_description,
                    jobDescription: markdown,
                    companyName,
                    jobTitle,
                    competitors,
                    products,
                    customers,
                    applicationId: appId,
                    applicationCreatedAt: new Date().toISOString(),
                    branding: brandingData,
                    regenerationCount: 0,
                  }),
                }
              );
              clearTimeout(timeoutId);

              if (resp.ok) {
                const data = await resp.json();
                if (data.html && assetRow) {
                  await supabase.from("generated_assets").update({
                    html: data.html,
                    generation_status: "complete",
                  }).eq("id", assetRow.id);
                }
              } else if (assetRow) {
                await supabase.from("generated_assets").update({
                  generation_status: "error",
                  generation_error: `HTTP ${resp.status}`,
                }).eq("id", assetRow.id);
              }
            } catch (fetchErr: any) {
              clearTimeout(timeoutId);
              console.warn(`Material fetch timed out or failed for ${asset.name}:`, fetchErr.message);
              if (assetRow) {
                await supabase.from("generated_assets").update({
                  generation_status: "error",
                  generation_error: fetchErr.name === "AbortError" ? "Timed out after 2 minutes" : fetchErr.message,
                }).eq("id", assetRow.id);
              }
            }
          } catch (e) {
            console.warn(`Material generation failed for ${asset.name}:`, e);
          }

          // Stagger to avoid rate limits
          if (i < recommendedAssets.length - 1) {
            await new Promise(r => setTimeout(r, 3000));
          }
        }

        // Score design variability after all materials are generated
        try {
          const { data: completedAssets } = await supabase
            .from("generated_assets")
            .select("asset_name, html")
            .eq("application_id", appId)
            .eq("generation_status", "complete")
            .not("html", "eq", "");

          if (completedAssets && completedAssets.length >= 2) {
            const { scoreDesignVariability } = await import("@/lib/api/designVariability");
            await scoreDesignVariability(
              appId,
              completedAssets.map((a: any) => ({ assetName: a.asset_name, html: a.html })),
              brandingData,
            );
          }
        } catch (e) {
          console.warn("Design variability scoring failed:", e);
        }
      }
      let dashboardRaw = "";
      try {
        await streamDashboardGeneration({
          jobDescription: markdown,
          branding: brandingData,
          companyName,
          jobTitle,
          competitors,
          customers,
          products,
          department,
          researchedSections,
          onDelta: (text) => { dashboardRaw += text; },
          onDone: () => {},
        });

        let dashboardHtml = "";
        let dashboardData: any = null;
        const parsed = parseLlmJsonOutput(dashboardRaw);
        if (parsed) {
          dashboardData = parsed;
          dashboardHtml = assembleDashboardHtml(parsed);
        } else {
          console.warn("Failed to parse dashboard JSON, falling back to raw HTML");
          dashboardHtml = dashboardRaw;
          const htmlStart = dashboardHtml.indexOf("<!DOCTYPE html>") !== -1
            ? dashboardHtml.indexOf("<!DOCTYPE html>")
            : dashboardHtml.indexOf("<!doctype html>");
          if (htmlStart > 0) dashboardHtml = dashboardHtml.slice(htmlStart);
          const htmlEnd = dashboardHtml.lastIndexOf("</html>");
          if (htmlEnd !== -1) dashboardHtml = dashboardHtml.slice(0, htmlEnd + 7);
        }

        await saveJobApplication({
          id: appId,
          job_url: jobUrl,
          dashboard_html: dashboardHtml,
          dashboard_data: dashboardData,
          status: "complete",
          generation_status: "complete",
        } as any);
      } catch (e) {
        console.warn("Dashboard generation failed:", e);
        // Still mark complete even if dashboard fails
        await saveJobApplication({
          id: appId,
          job_url: jobUrl,
          status: "complete",
          generation_status: "complete",
        } as any);
      }

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
          const parsed = parseLlmJsonOutput(accumulated);
          if (parsed) {
            accumulated = assembleDashboardHtml(parsed);
          } else {
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
