import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowLeft, Loader2,
  Info, FileText, Mail, FileUser, Sparkles, ArrowLeftRight,
} from "lucide-react";
import GenerationErrorBanner from "@/components/GenerationErrorBanner";
import { useApplicationDetail } from "@/hooks/useApplicationDetail";
import { streamResumeGeneration } from "@/lib/api/resume";
import { saveResumeRevision } from "@/lib/api/resumeRevisions";
import {
  getProposedAssets,
  getGeneratedAssets,
  streamDynamicAssetGeneration,
  updateGeneratedAsset,
  saveDynamicAssetRevision,
  type GeneratedAsset,
} from "@/lib/api/dynamicAssets";
import { getActiveResumeText } from "@/lib/api/profile";
import { cleanHtml } from "@/lib/cleanHtml";
import CoverLetterTab from "@/components/tabs/CoverLetterTab";
import HtmlAssetTab from "@/components/tabs/HtmlAssetTab";
import JobDescriptionTab from "@/components/tabs/JobDescriptionTab";
import DetailsTab from "@/components/tabs/DetailsTab";
import DynamicAssetTab from "@/components/DynamicAssetTab";
import ChangeAssetDialog from "@/components/ChangeAssetDialog";
import AssetProposalCard from "@/components/AssetProposalCard";
import UpgradeGate from "@/components/UpgradeGate";
import ProposeMaterialsCTA from "@/components/ProposeMaterialsCTA";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import ImpersonationNotice from "@/components/ImpersonationNotice";
import { useSubscription } from "@/hooks/useSubscription";
import AtsScoreCard from "@/components/AtsScoreCard";
import { scoreAtsMatch, scoreBaselineResume, isCacheValid, type AtsScoreResult } from "@/lib/api/atsScore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  updatePipelineStage,
  type PipelineStage,
} from "@/lib/pipelineStages";
import { downloadHtmlAsDocx, buildDocxFilename } from "@/lib/docxExport";

type ActiveView = "cover-letter" | "resume" | string;

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useApplicationDetail(id);
  const { isAssetAllowed, canRefine, tier } = useSubscription();
  const [activeView, setActiveView] = useState<ActiveView>("resume");

  // Dynamic assets state
  const [dynamicAssets, setDynamicAssets] = useState<GeneratedAsset[]>([]);
  const [hasProposals, setHasProposals] = useState(false);
  const [dynamicLoading, setDynamicLoading] = useState(true);
  const [showProposalDialog, setShowProposalDialog] = useState(false);

  // ATS Score state
  const [atsScore, setAtsScore] = useState<AtsScoreResult | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);

  // Auto-trigger tracking
  const prevResumeHtmlRef = useRef<string>("");
  const atsAutoTriggered = useRef(false);

  // Pipeline stage
  const currentStage = (state.app?.pipeline_stage || 'applied') as PipelineStage;

  // Load ATS score from app data
  useEffect(() => {
    if (state.app?.ats_score) {
      const score = state.app.ats_score as unknown as AtsScoreResult;
      if (score.score != null) setAtsScore(score);
    }
  }, [state.app]);

  // Auto-trigger ATS scan when resume generation completes
  useEffect(() => {
    const prevHtml = prevResumeHtmlRef.current;
    const currentHtml = state.resumeHtml;
    prevResumeHtmlRef.current = currentHtml;

    // Detect resume appearing (was empty, now populated)
    if (!prevHtml && currentHtml && currentHtml.length > 100 && state.jobDescription && !atsAutoTriggered.current) {
      atsAutoTriggered.current = true;
      handleAtsRescan();
    }
  }, [state.resumeHtml, state.jobDescription]);

  const handleAtsRescan = async () => {
    if (!id || !state.resumeHtml || !state.jobDescription) return;
    setAtsLoading(true);
    try {
      // Get baseline score if we don't have one yet
      let baselineScore = atsScore?._baselineScore;
      if (baselineScore == null) {
        baselineScore = (await scoreBaselineResume(state.jobDescription)) ?? undefined;
      }

      const result = await scoreAtsMatch(id, state.jobDescription, state.resumeHtml, baselineScore);
      setAtsScore(result);
    } catch (err: any) {
      console.warn("ATS scoring failed:", err);
    } finally {
      setAtsLoading(false);
    }
  };

  /** Apply a suggested bullet fix directly into the resume HTML */
  const handleApplyBulletFix = async (originalText: string, newText: string): Promise<boolean> => {
    if (!id || !state.resumeHtml) return false;
    try {
      const escaped = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let updated = state.resumeHtml;
      if (updated.includes(originalText)) {
        updated = updated.replace(originalText, newText);
      } else {
        const fuzzyPattern = new RegExp(escaped.replace(/\s+/g, '\\s+'), 'i');
        updated = updated.replace(fuzzyPattern, newText);
      }
      if (updated === state.resumeHtml) return false;
      state.setResumeHtml(updated);
      await state.saveField({ resume_html: updated });
      return true;
    } catch {
      return false;
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!id) return;
    try {
      await updatePipelineStage(id, currentStage, newStage as PipelineStage);
      state.reload();
    } catch (err: any) {
      console.warn("Stage update failed:", err);
    }
  };

  // Load dynamic assets on mount
  useEffect(() => {
    if (!id) return;
    (async () => {
      setDynamicLoading(true);
      try {
        const [assets, proposals] = await Promise.all([
          getGeneratedAssets(id),
          getProposedAssets(id),
        ]);
        setDynamicAssets(assets);
        setHasProposals(proposals.length > 0);
      } catch { }
      finally { setDynamicLoading(false); }
    })();
  }, [id]);

  const handleAssetsConfirmed = async (assets: GeneratedAsset[]) => {
    setDynamicAssets(assets);
    setShowProposalDialog(false);
    for (const asset of assets) {
      generateDynamicAsset(asset);
    }
  };

  const generateDynamicAsset = async (asset: GeneratedAsset) => {
    try {
      await updateGeneratedAsset(asset.id, { generation_status: 'generating' });
      setDynamicAssets((prev) =>
        prev.map((a) => a.id === asset.id ? { ...a, generation_status: 'generating' } : a)
      );

      let resumeText = "";
      try { resumeText = await getActiveResumeText(); } catch { }

      const { getLayoutStyleForAsset } = await import("@/lib/assetLayoutStyles");
      const layoutStyle = getLayoutStyleForAsset(asset.asset_name, dynamicAssets.map(a => a.asset_name));

      let accumulated = "";
      await streamDynamicAssetGeneration({
        assetName: asset.asset_name,
        briefDescription: asset.brief_description,
        jobDescription: state.jobDescription,
        resumeText,
        companyName: state.companyName,
        jobTitle: state.jobTitle,
        branding: state.app?.branding,
        layoutStyle,
        onDelta: (text) => { accumulated += text; },
        onDone: () => {},
      });

      const cleaned = cleanHtml(accumulated);
      const updated = await updateGeneratedAsset(asset.id, {
        html: cleaned,
        generation_status: 'complete',
      });

      try {
        await saveDynamicAssetRevision(asset.id, asset.application_id, cleaned, "Initial generation");
      } catch { }

      setDynamicAssets((prev) =>
        prev.map((a) => a.id === asset.id ? updated : a)
      );
    } catch (err: any) {
      await updateGeneratedAsset(asset.id, {
        generation_status: 'error',
        generation_error: err.message,
      });
      setDynamicAssets((prev) =>
        prev.map((a) => a.id === asset.id ? { ...a, generation_status: 'error', generation_error: err.message } : a)
      );
    }
  };

  const handleAssetUpdated = (updated: GeneratedAsset) => {
    setDynamicAssets((prev) =>
      prev.map((a) => a.id === updated.id ? updated : a)
    );
  };

  if (state.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!state.app) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Application not found.</p>
        <Button variant="outline" onClick={() => navigate("/applications")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const primaryTabs = [
    { id: "resume" as const, label: "Resume", icon: FileUser },
    { id: "cover-letter" as const, label: "Cover Letter", icon: Mail },
  ];

  const isPrimaryView = ["cover-letter", "resume"].includes(activeView);
  const activeDynamicAsset = dynamicAssets.find((a) => a.id === activeView);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
        <ImpersonationNotice />
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/applications")} className="h-10 w-10 sm:h-8 sm:w-auto p-0 sm:px-3">
              <ArrowLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight font-heading truncate">
                {state.companyName || "Unknown Company"} — {state.jobTitle || "Unknown Role"}
              </h1>
              <p className="text-xs text-muted-foreground truncate max-w-md">{state.app.job_url}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={currentStage} onValueChange={handleStageChange}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              data-tutorial="pipeline-link"
              variant="link"
              size="sm"
              className="text-xs text-muted-foreground px-1 h-8 hidden sm:inline-flex"
              onClick={() => navigate("/?view=pipeline")}
            >
              View all stages →
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 w-10 sm:h-8 sm:w-auto p-0 sm:px-3">
                  <Info className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Info</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle className="font-heading">Application Details</SheetTitle>
                </SheetHeader>
                <div className="space-y-6">
                  <DetailsTab state={state} />
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" /> Job Description
                    </h3>
                    <JobDescriptionTab state={state} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Badge variant={state.app.status === "complete" ? "default" : "secondary"}>{state.app.status}</Badge>
          </div>
        </div>

        {/* Top-level generation error */}
        {(state.app.generation_status === "error" || state.app.generation_status === "failed") && (
          <GenerationErrorBanner
            error={state.app.generation_error}
            status={state.app.generation_status}
            onRetry={() => state.reload()}
            assetLabel="Application"
          />
        )}

        {/* Primary Tab Triggers */}
        <div data-tutorial="asset-tabs" className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              data-tutorial={`${tab.id}-tab`}
              onClick={() => setActiveView(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeView === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
          {dynamicAssets.length === 0 && !dynamicLoading && (
            <div className="ml-auto -mb-px pb-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProposalDialog(true)}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Propose Materials
              </Button>
            </div>
          )}
        </div>

        {/* Prominent CTA when generation is complete but no industry materials yet */}
        {state.app.status === "complete" && dynamicAssets.length === 0 && !dynamicLoading && isPrimaryView && (
          <ProposeMaterialsCTA onPropose={() => setShowProposalDialog(true)} />
        )}

        {/* Dynamic Assets Bar */}
        {dynamicAssets.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Industry Materials
            </span>
            <div data-tutorial="industry-assets-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {dynamicAssets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveView(asset.id)}
                    className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                      activeView === asset.id
                        ? "border-primary bg-primary/5 text-foreground shadow-sm"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/50"
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{asset.asset_name}</span>
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ml-auto ${
                        asset.generation_status === 'complete' && asset.html
                          ? "bg-primary"
                          : asset.generation_status === 'generating'
                          ? "bg-yellow-500 animate-pulse"
                          : asset.generation_status === 'error'
                          ? "bg-destructive"
                          : "bg-muted-foreground/30"
                      }`}
                      title={asset.generation_status}
                    />
                  </button>
                  {!asset.downloaded_at && tier !== "free" && (
                    <ChangeAssetDialog
                      asset={asset}
                      otherAssetNames={dynamicAssets.filter((a) => a.id !== asset.id).map((a) => a.asset_name)}
                      jobDescription={state.jobDescription}
                      companyName={state.companyName}
                      jobTitle={state.jobTitle}
                      onAssetReplaced={(updated) => {
                        handleAssetUpdated(updated);
                        generateDynamicAsset(updated);
                      }}
                    >
                      <Button data-tutorial="change-asset-btn" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Change document type">
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      </Button>
                    </ChangeAssetDialog>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div>
          {activeView === "cover-letter" && (
            <CoverLetterTab appId={id!} state={state} />
          )}
          {activeView === "resume" && (
            <div className="space-y-3">
              {(state.resumeHtml || atsScore) && (
                <AtsScoreCard
                  score={atsScore}
                  loading={atsLoading}
                  onRescan={handleAtsRescan}
                  onApplyFix={handleApplyBulletFix}
                  disabled={!state.resumeHtml || !state.jobDescription}
                />
              )}
              <HtmlAssetTab
                appId={id!}
                state={state}
                assetType="resume"
                label="Resume"
                dbField="resume_html"
                html={state.resumeHtml}
                setHtml={state.setResumeHtml}
                generateFn={streamResumeGeneration}
                saveRevisionFn={saveResumeRevision}
                emptyIcon={FileUser}
                refinePlaceholder='e.g. "Make it more concise" or "Emphasize leadership experience"'
                canRefine={canRefine}
              />
            </div>
          )}

          {/* Dynamic asset view */}
          {activeDynamicAsset && (
            <UpgradeGate feature="Industry Materials" isLocked={!isAssetAllowed("dynamic") && tier !== "free"} requiredTier="premium">
              <DynamicAssetTab
                key={activeDynamicAsset.id}
                asset={activeDynamicAsset}
                allAssetNames={dynamicAssets.map(a => a.asset_name)}
                jobDescription={state.jobDescription}
                companyName={state.companyName}
                jobTitle={state.jobTitle}
                branding={state.app?.branding}
                onAssetUpdated={handleAssetUpdated}
                canRefine={canRefine}
                isPreviewOnly={tier === "free"}
              />
            </UpgradeGate>
          )}

          {/* Proposal Dialog */}
          <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
            <DialogContent className="max-w-lg">
              <AssetProposalCard
                applicationId={id!}
                jobDescription={state.jobDescription}
                companyName={state.companyName}
                jobTitle={state.jobTitle}
                onAssetsConfirmed={handleAssetsConfirmed}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetail;
