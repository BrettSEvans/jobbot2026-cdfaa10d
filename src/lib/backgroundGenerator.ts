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
import { validateDashboardAlignment } from "@/lib/dashboard/jdAlignmentValidator";
import { parseJobDescription } from "@/lib/api/jdIntelligence";
import { generateOptimizedResume } from "@/lib/api/resumeGeneration";
import { generateClarityResume } from "@/lib/api/resumeGenerationClarity";
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
  | "awaiting-dashboard-config"
  | "dashboard"
  | "complete"
  | "error";

export type GenerationJob = {
  applicationId: string;
  status: GenerationJobStatus;
  progress: string;
  error?: string;
  companyName?: string;
  currentAsset?: string;
  generatingAssets?: string[];
  // Data for dashboard customization dialog
  researchedSections?: any[];
  researchedCfoScenarios?: any[];
  scrapedBranding?: any;
  // Internal pipeline state for resume after user config
  _pipelineState?: {
    jobUrl: string;
    companyUrl?: string;
    markdown: string;
    brandingData: any;
    companyName: string;
    jobTitle: string;
    department: string;
    competitors: string[];
    customers: string[];
    products: string[];
    jdIntelligence: any;
    candidateName: string;
  };
};

type Listener = () => void;

class BackgroundGenerationManager {
  private jobs: Map<string, GenerationJob> = new Map();
  private listeners: Set<Listener> = new Set();
  private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

  private updateBeforeUnload() {
    const hasActive = this.getActiveCount() > 0;
    if (hasActive && !this.beforeUnloadHandler) {
      this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "Generation in progress — are you sure you want to leave?";
      };
      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    } else if (!hasActive && this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
    this.updateBeforeUnload();
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
      // ========== PHASE 1: Scrape job (sequential — everything else depends on markdown) ==========
      let markdown = manualDescription || "";
      if (!useManualInput && jobUrl) {
        this.updateJob(appId, { status: "reviewing-job", progress: "Reviewing job posting..." });
        await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "reviewing-job" } as any);
        try {
          const result = await scrapeJob(jobUrl);
          markdown = result.markdown;
        } catch (scrapeErr: any) {
          if (scrapeErr?.blocked || scrapeErr?.message === 'BLOCKED_SITE') {
            const hostname = (() => { try { return new URL(jobUrl).hostname; } catch { return jobUrl; } })();
            this.updateJob(appId, { status: "error", progress: `This site (${hostname}) blocks automated scraping. Please use "Paste text instead" to manually enter the job description.` });
            await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "error", generation_error: `Blocked site: ${hostname}. Use manual paste.` } as any);
            return;
          }
          throw scrapeErr;
        }
      }
      this.updateJob(appId, { status: "reviewing-job", progress: "Job description ready" });

      // ========== PHASE 2: Run branding, analysis, JD parse, and profile fetch ALL IN PARALLEL ==========
      this.updateJob(appId, { status: "analyzing", progress: "Analyzing job & company..." });
      await saveJobApplication({ id: appId, job_url: jobUrl, generation_status: "analyzing" } as any);

      // Launch all independent tasks concurrently
      const brandingPromise = (companyUrl?.trim())
        ? scrapeCompanyBranding(companyUrl).catch((e) => { console.warn("Branding scrape failed:", e); return null; })
        : Promise.resolve(null);

      const analysisPromise = analyzeCompany({
        companyMarkdown: "", // branding markdown not available yet in parallel mode
        jobDescription: markdown,
      }).catch((e) => { console.warn("Analysis failed:", e); return null; });

      const jdIntelligencePromise = (markdown && markdown.length >= 50)
        ? parseJobDescription({ jobDescriptionMarkdown: markdown, companyName: "" }).catch((e) => { console.warn("JD intelligence parse failed:", e); return null; })
        : Promise.resolve(null);

      const profilePromise = (async () => {
        let resumeText = "";
        let candidateName = "";
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, middle_name, last_name, resume_text")
              .eq("id", user.id)
              .single();
            if (profile) {
              candidateName = [profile.first_name, profile.middle_name, profile.last_name]
                .filter(Boolean).join(" ");
            }
            const { data: activeResume } = await supabase
              .from("user_resumes")
              .select("resume_text")
              .eq("user_id", user.id)
              .eq("is_active", true)
              .single();
            if (activeResume?.resume_text) {
              resumeText = activeResume.resume_text;
            } else {
              resumeText = profile?.resume_text || "";
            }
          }
        } catch (e) {
          console.warn("Failed to fetch user resume text:", e);
        }
        return { resumeText, candidateName };
      })();

      // Await all parallel tasks
      const [brandingResult, analysisResult, jdIntelligence, profileResult] = await Promise.all([
        brandingPromise,
        analysisPromise,
        jdIntelligencePromise,
        profilePromise,
      ]);

      // Extract results
      let brandingData: any = null;
      if (brandingResult) {
        brandingData = brandingResult.branding;
      }

      let companyName = analysisResult?.companyName || "";
      let jobTitle = analysisResult?.jobTitle || "";

      // Update job with company name for toast display
      this.updateJob(appId, { companyName });
      let department = analysisResult?.department || "";
      let competitors: string[] = analysisResult?.competitors || [];
      let customers: string[] = analysisResult?.customers || [];
      let products: string[] = analysisResult?.products || [];

      // Override department with authoritative JD intelligence
      if (jdIntelligence?.department) {
        department = jdIntelligence.department;
      }

      const { resumeText, candidateName } = profileResult;

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

      // ========== PHASE 3: Generate resume (foreground phase end) ==========
      this.updateJob(appId, { status: "resume", progress: "Generating tailored resume..." });

      if (resumeText && markdown) {
        const [atsResult, clarityResult] = await Promise.allSettled([
          generateOptimizedResume({
            jobDescription: markdown,
            resumeText,
            missingKeywords: [],
            companyName,
            jobTitle,
          }),
          generateClarityResume({
            jobDescription: markdown,
            resumeText,
            companyName,
            jobTitle,
          }),
        ]);

        const savePayload: any = {
          id: appId,
          job_url: jobUrl,
          generation_status: "resume-complete",
          status: "resume-complete",
        };

        if (atsResult.status === "fulfilled") {
          savePayload.resume_html = atsResult.value.resume_html;
        } else {
          console.warn("ATS resume generation failed:", atsResult.reason);
        }

        if (clarityResult.status === "fulfilled") {
          savePayload.clarity_resume_html = clarityResult.value.resume_html;
        } else {
          console.warn("Clarity resume generation failed:", clarityResult.reason);
        }

        await saveJobApplication(savePayload);
      } else {
        await saveJobApplication({
          id: appId,
          job_url: jobUrl,
          generation_status: "resume-complete",
          status: "resume-complete",
        } as any);
      }

      // Build list of assets that will be generated in background
      const upcomingAssets: string[] = ["Cover Letter"];
      const recommendedAssetNames = (jdIntelligence?.recommended_assets || []).map((a: any) => a.name);
      upcomingAssets.push(...recommendedAssetNames);
      upcomingAssets.push("Dashboard");

      // Signal foreground completion — user navigates to detail page now
      this.updateJob(appId, {
        status: "resume-complete",
        progress: "Resume ready! Generating remaining assets...",
        generatingAssets: upcomingAssets,
        currentAsset: "Cover Letter",
      });

      // ========== PHASE 4: Background (research + cover letter + materials + dashboard) ==========

      // 4a. Research company (deferred from foreground — only feeds dashboard)
      let researchedSections: any[] | undefined;
      let researchedCfoScenarios: any[] | undefined;
      try {
        this.updateJob(appId, { progress: "Researching company..." });
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
        researchedCfoScenarios = research.cfoScenarios;
      } catch (e) {
        console.warn("Research failed:", e);
      }

      // 4b. Generate cover letter
      this.updateJob(appId, { status: "cover-letter", progress: "Generating cover letter...", currentAsset: "Cover Letter" });
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

      // 4c. Generate dynamic materials from JD-recommended assets (parallelized with concurrency pool)
      const recommendedAssets = jdIntelligence?.recommended_assets || [];
      if (recommendedAssets.length > 0) {
        this.updateJob(appId, { status: "generating-materials", progress: `Generating materials (0/${recommendedAssets.length})...` });

        // Upsert proposed_assets (fast, non-AI)
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

        // Build task functions for the concurrency pool
        let completedCount = 0;
        const inFlight = new Set<string>();

        const updateMaterialProgress = () => {
          const inFlightNames = Array.from(inFlight);
          this.updateJob(appId, {
            status: "generating-materials",
            progress: `Generating materials (${completedCount}/${recommendedAssets.length})...`,
            currentAsset: inFlightNames.length > 0 ? inFlightNames.join(", ") : undefined,
          });
        };

        const tasks = recommendedAssets.map((asset: any) => async () => {
          inFlight.add(asset.name);
          updateMaterialProgress();

          try {
            const { data: assetRow } = await supabase.from("generated_assets").insert({
              application_id: appId,
              asset_name: asset.name,
              brief_description: asset.brief_description,
              generation_status: "generating",
            }).select().single();

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120_000);

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
                    candidateName,
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
          } finally {
            inFlight.delete(asset.name);
            completedCount++;
            updateMaterialProgress();
          }
        });

        // Run tasks with concurrency pool (max 3 simultaneous, 1s stagger)
        await runWithConcurrency(tasks, 3, 1000);

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

      // 4d. PAUSE for dashboard customization — store research data on job
      this.updateJob(appId, {
        status: "awaiting-dashboard-config",
        progress: "Customize your dashboard",
        currentAsset: "Dashboard",
        researchedSections,
        researchedCfoScenarios,
        scrapedBranding: brandingData,
        _pipelineState: {
          jobUrl,
          companyUrl,
          markdown,
          brandingData,
          companyName,
          jobTitle,
          department,
          competitors,
          customers,
          products,
          jdIntelligence,
          candidateName,
        },
      });

      // Auto-resume with defaults after 5 minutes if user doesn't interact
      setTimeout(() => {
        const currentJob = this.jobs.get(appId);
        if (currentJob?.status === "awaiting-dashboard-config") {
          console.log("[Pipeline] Auto-resuming dashboard generation with defaults for", appId);
          this.resumeDashboardGeneration(appId, {
            selectedSections: researchedSections?.slice(0, 7),
            selectedCfoScenarios: researchedCfoScenarios
              ?.sort((a: any, b: any) => (a.relevanceRank || 99) - (b.relevanceRank || 99))
              .slice(0, 3),
          });
        }
      }, 300_000);
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
   * Resume dashboard generation after user has made customization choices.
   */
  async resumeDashboardGeneration(
    appId: string,
    userChoices: {
      colors?: { primary: string; secondary: string };
      selectedSections?: any[];
      selectedCfoScenarios?: any[];
    }
  ) {
    const job = this.jobs.get(appId);
    if (!job?._pipelineState) {
      console.warn("No pipeline state found for", appId);
      return;
    }

    const {
      jobUrl,
      markdown,
      brandingData,
      companyName,
      jobTitle,
      department,
      competitors,
      customers,
      products,
      jdIntelligence,
    } = job._pipelineState;

    // Apply user color choices to branding
    let effectiveBranding = brandingData;
    if (userChoices.colors) {
      effectiveBranding = {
        ...brandingData,
        userColors: userChoices.colors,
      };
    }

    const effectiveSections = userChoices.selectedSections || job.researchedSections?.slice(0, 7);
    const effectiveCfoScenarios = userChoices.selectedCfoScenarios ||
      job.researchedCfoScenarios
        ?.sort((a: any, b: any) => (a.relevanceRank || 99) - (b.relevanceRank || 99))
        .slice(0, 3);

    // Clear dialog data from job
    this.updateJob(appId, {
      status: "dashboard",
      progress: "Generating dashboard...",
      currentAsset: "Dashboard",
      researchedSections: undefined,
      researchedCfoScenarios: undefined,
      scrapedBranding: undefined,
      _pipelineState: undefined,
    });

    let dashboardRaw = "";
    try {
      await streamDashboardGeneration({
        jobDescription: markdown,
        branding: effectiveBranding,
        companyName,
        jobTitle,
        competitors,
        customers,
        products,
        department,
        researchedSections: effectiveSections,
        selectedCfoScenarios: effectiveCfoScenarios,
        userColors: userChoices.colors,
        onDelta: (text) => { dashboardRaw += text; },
        onDone: () => {},
      });

      let dashboardHtml = "";
      let dashboardData: any = null;
      const parsed = parseLlmJsonOutput(dashboardRaw);
      if (parsed) {
        dashboardData = parsed;
        dashboardHtml = assembleDashboardHtml(parsed);

        const alignmentReport = validateDashboardAlignment(parsed, jdIntelligence);
        console.log(
          `[DashboardValidation] Score: ${alignmentReport.score}/100 | Keywords: ${alignmentReport.keywordCoverage}% | Requirements: ${alignmentReport.requirementCoverage}% | Agentic: ${alignmentReport.hasAgenticWorkforce} | CFO: ${alignmentReport.hasCfoView}`
        );
        if (alignmentReport.gaps.length > 0) {
          console.warn(
            "[DashboardValidation] Gaps found:",
            alignmentReport.gaps.map((g) => `[${g.severity}] ${g.message}`)
          );
        }

        if (dashboardData) {
          dashboardData._alignmentReport = {
            score: alignmentReport.score,
            keywordCoverage: alignmentReport.keywordCoverage,
            requirementCoverage: alignmentReport.requirementCoverage,
            hasAgenticWorkforce: alignmentReport.hasAgenticWorkforce,
            hasCfoView: alignmentReport.hasCfoView,
            gapCount: alignmentReport.gaps.length,
            criticalGaps: alignmentReport.gaps
              .filter((g) => g.severity === "critical")
              .map((g) => g.message),
          };
        }
      } else {
        console.warn("Failed to parse dashboard JSON, falling back to raw HTML");
        dashboardHtml = dashboardRaw;
        const htmlStart = dashboardHtml.indexOf("<!DOCTYPE html>") !== -1
          ? dashboardHtml.indexOf("<!DOCTYPE html>")
          : dashboardHtml.indexOf("<!doctype html>");
        if (htmlStart > 0) dashboardHtml = dashboardHtml.slice(htmlStart);
        const htmlEnd = dashboardHtml.lastIndexOf("</html>");
        if (htmlEnd !== -1) dashboardHtml = dashboardHtml.slice(0, htmlEnd + 7);

        const dataMatch = dashboardHtml.match(/window\.__DASHBOARD_DATA__\s*=\s*({[\s\S]*?});?\s*<\/script>/);
        if (dataMatch) {
          try {
            const embeddedData = JSON.parse(dataMatch[1]);
            if (department && embeddedData?.meta) {
              embeddedData.meta.department = department;
              dashboardHtml = dashboardHtml.replace(
                dataMatch[0],
                `window.__DASHBOARD_DATA__=${JSON.stringify(embeddedData)};</script>`
              );
            }
            dashboardData = embeddedData;
          } catch (extractErr) {
            console.warn("Failed to extract embedded dashboard data from HTML:", extractErr);
          }
        }
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
      await saveJobApplication({
        id: appId,
        job_url: jobUrl,
        status: "complete",
        generation_status: "complete",
      } as any);
    }

    this.updateJob(appId, { status: "complete", progress: "Done!" });
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
    onComplete,
  }: {
    applicationId: string;
    currentHtml: string;
    currentDashboardData?: any;
    userMessage: string;
    chatHistory: Array<{ role: string; content: string }>;
    jobUrl: string;
    onComplete?: (newHtml: string, newData: any | null, updatedChatHistory: Array<{ role: string; content: string }>) => void;
  }): Promise<void> {
    const job: GenerationJob = {
      applicationId,
      status: "dashboard",
      progress: "Refining dashboard...",
    };
    this.jobs.set(applicationId, job);
    this.notify();

    this.runRefinement(applicationId, currentHtml, currentDashboardData, userMessage, chatHistory, jobUrl, onComplete);
  }

  private async runRefinement(
    appId: string,
    currentHtml: string,
    currentDashboardData: any | undefined,
    userMessage: string,
    chatHistory: Array<{ role: string; content: string }>,
    jobUrl: string,
    onComplete?: (newHtml: string, newData: any | null, updatedChatHistory: Array<{ role: string; content: string }>) => void,
  ) {
    try {
      const { streamDashboardRefinement } = await import("@/lib/api/jobApplication");

      let accumulated = "";
      let parsedData: any = null;
      await streamDashboardRefinement({
        currentHtml,
        currentDashboardData,
        userMessage,
        chatHistory,
        onDelta: (text) => { accumulated += text; },
        onDone: () => {
          const parsed = parseLlmJsonOutput(accumulated);
          if (parsed) {
            parsedData = parsed;
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
      const savePayload: Record<string, unknown> = {
        id: appId,
        job_url: jobUrl,
        dashboard_html: accumulated,
        chat_history: updatedHistory,
      };
      if (parsedData) {
        savePayload.dashboard_data = parsedData;
      }
      await saveJobApplication(savePayload as any);

      this.updateJob(appId, { status: "complete", progress: "Refinement complete!" });

      // Notify caller so React state is updated immediately
      if (onComplete) {
        try {
          onComplete(accumulated, parsedData, updatedHistory);
        } catch (cbErr) {
          console.warn("onComplete callback error:", cbErr);
        }
      }
    } catch (err: any) {
      console.error("Background refinement error:", err);
      this.updateJob(appId, { status: "error", progress: "Refinement failed", error: err.message });
    }
  }
}

// Singleton — persists across React navigations
export const backgroundGenerator = new BackgroundGenerationManager();
