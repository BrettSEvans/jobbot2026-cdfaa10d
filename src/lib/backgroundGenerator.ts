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
import { streamExecutiveReport } from "@/lib/api/executiveReport";
import { streamRaidLog } from "@/lib/api/raidLog";
import { streamArchitectureDiagram } from "@/lib/api/architectureDiagram";
import { streamRoadmap } from "@/lib/api/roadmap";
import { streamResumeGeneration, getResumeStyle } from "@/lib/api/resume";
import { cleanHtml } from "@/lib/cleanHtml";
import {
  proposeAssets,
  confirmAssetSelection,
  streamDynamicAssetGeneration,
  updateGeneratedAsset,
  saveDynamicAssetRevision,
} from "@/lib/api/dynamicAssets";
import { supabase } from "@/integrations/supabase/client";
import { injectWatermark } from "@/lib/watermarkHtml";

export type GenerationJob = {
  applicationId: string;
  status: "pending" | "scraping" | "analyzing" | "cover-letter" | "generating-assets" | "executive-report" | "raid-log" | "architecture-diagram" | "roadmap" | "resume" | "generating-asset" | "refining-asset" | "complete" | "error";
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

      // 4. Generate cover letter
      this.updateJob(appId, { status: "cover-letter", progress: "Generating cover letter..." });
      let coverLetter = "";
      await streamTailoredLetter({
        jobDescription: markdown,
        profileContext,
        onDelta: (text) => { coverLetter += text; },
        onDone: () => {},
      });

      await saveJobApplication({
        id: appId,
        job_url: jobUrl,
        cover_letter: coverLetter,
        generation_status: "generating-assets",
      });

      // 5. Generate remaining assets IN PARALLEL (resume + reports)
      const totalAssets = 5;
      this.updateJob(appId, {
        status: "generating-assets",
        progress: `Generating additional assets... (0/${totalAssets} completed)`,
        parallelCompleted: 0,
        parallelTotal: totalAssets,
      });

      let parallelDone = 0;
      const bumpCount = () => {
        parallelDone++;
        this.updateJob(appId, {
          progress: `Generating additional assets... (${parallelDone}/${totalAssets} completed)`,
          parallelCompleted: parallelDone,
        });
      };

      const generateExecReport = async (): Promise<string | null> => {
        try {
          let accumulated = "";
          await streamExecutiveReport({
            jobDescription: markdown, companyName, jobTitle, competitors, customers, products, department, branding: brandingData, profileContext,
            onDelta: (text) => { accumulated += text; },
            onDone: () => {},
          });
          return cleanHtml(accumulated);
        } catch (e) {
          console.warn("Executive report generation failed:", e);
          return null;
        } finally {
          bumpCount();
        }
      };

      const generateRaidLog = async (): Promise<string | null> => {
        try {
          let accumulated = "";
          await streamRaidLog({
            jobDescription: markdown, companyName, jobTitle, competitors, customers, products, department, branding: brandingData,
            onDelta: (text) => { accumulated += text; },
            onDone: () => {},
          });
          return cleanHtml(accumulated);
        } catch (e) {
          console.warn("RAID log generation failed:", e);
          return null;
        } finally {
          bumpCount();
        }
      };

      const generateArchDiagram = async (): Promise<string | null> => {
        try {
          let accumulated = "";
          await streamArchitectureDiagram({
            jobDescription: markdown, companyName, jobTitle, competitors, customers, products, department, branding: brandingData,
            onDelta: (text) => { accumulated += text; },
            onDone: () => {},
          });
          return cleanHtml(accumulated);
        } catch (e) {
          console.warn("Architecture diagram generation failed:", e);
          return null;
        } finally {
          bumpCount();
        }
      };

      const generateRoadmap = async (): Promise<string | null> => {
        try {
          let accumulated = "";
          await streamRoadmap({
            jobDescription: markdown, companyName, jobTitle, competitors, customers, products, department, branding: brandingData,
            onDelta: (text) => { accumulated += text; },
            onDone: () => {},
          });
          return cleanHtml(accumulated);
        } catch (e) {
          console.warn("Roadmap generation failed:", e);
          return null;
        } finally {
          bumpCount();
        }
      };

      const generateResume = async (): Promise<string | null> => {
        try {
          // Fetch the selected resume style's system prompt
          let systemPrompt: string | undefined;
          if (resumeStyleId) {
            try {
              const style = await getResumeStyle(resumeStyleId);
              systemPrompt = style.system_prompt;
            } catch (e) {
              console.warn("Failed to fetch resume style, using default:", e);
            }
          }

          // Get user's baseline resume text from profile
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
          return cleanHtml(accumulated);
        } catch (e) {
          console.warn("Resume generation failed:", e);
          return null;
        } finally {
          bumpCount();
        }
      };

      const [execResult, raidResult, archResult, roadmapResult, resumeResult] = await Promise.allSettled([
        generateExecReport(),
        generateRaidLog(),
        generateArchDiagram(),
        generateRoadmap(),
        generateResume(),
      ]);

      const execReportHtml = execResult.status === "fulfilled" ? execResult.value : null;
      const raidLogHtml = raidResult.status === "fulfilled" ? raidResult.value : null;
      const archDiagramHtml = archResult.status === "fulfilled" ? archResult.value : null;
      const roadmapHtml = roadmapResult.status === "fulfilled" ? roadmapResult.value : null;
      const resumeHtml = resumeResult.status === "fulfilled" ? resumeResult.value : null;

      // 6. Single consolidated save (no dashboard)
      await saveJobApplication({
        id: appId,
        job_url: jobUrl,
        ...(execReportHtml ? { executive_report_html: execReportHtml } : {}),
        ...(raidLogHtml ? { raid_log_html: raidLogHtml } : {}),
        ...(archDiagramHtml ? { architecture_diagram_html: archDiagramHtml } : {}),
        ...(roadmapHtml ? { roadmap_html: roadmapHtml } : {}),
        ...(resumeHtml ? { resume_html: resumeHtml } : {}),
        status: "complete",
        generation_status: "complete",
      });

      // 7. Auto-generate preview assets for FREE tier users
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          const { data: subscription } = await supabase
            .from("user_subscriptions")
            .select("tier")
            .eq("user_id", userData.user.id)
            .single();
          
          if (subscription?.tier === "free") {
            this.updateJob(appId, { progress: "Generating preview materials..." });
            await this.generateFreePreviewAssets(appId, markdown, companyName, jobTitle, brandingData);
          }
        }
      } catch (previewErr) {
        console.warn("Preview asset generation failed (non-critical):", previewErr);
      }

      this.abortControllers.delete(appId);
      this.updateJob(appId, { status: "complete", progress: "Done!" });
    } catch (err: any) {
      this.abortControllers.delete(appId);
      const isCancelled = signal?.aborted;
      if (isCancelled) {
        // Already handled by cancelJob — just save the status
      } else {
        console.error("Background generation error:", err);
        this.updateJob(appId, { status: "error", progress: "Failed", error: err.message });
      }
      try {
        await saveJobApplication({
          id: appId,
          job_url: jobUrl,
          status: "error",
          generation_status: "error",
          generation_error: err.message,
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
    } catch (err: any) {
      console.error(`Background ${label} error:`, err);
      this.updateJob(jobKey, { status: "error", progress: `${label} failed`, error: err.message });
    }
  }

}

// Singleton — persists across React navigations
export const backgroundGenerator = new BackgroundGenerationManager();
