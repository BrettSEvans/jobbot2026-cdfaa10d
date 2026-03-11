import { useState } from "react";
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
import { useDynamicAssets } from "@/hooks/useDynamicAssets";
import { useAtsAutoScore } from "@/hooks/useAtsAutoScore";
import { streamResumeGeneration } from "@/lib/api/resume";
import { saveResumeRevision } from "@/lib/api/resumeRevisions";
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
import { useUserRoles } from "@/hooks/useUserRoles";
import DesignVariabilityCard from "@/components/admin/DesignVariabilityCard";
import { useCoverLetterNudge } from "@/hooks/useCoverLetterNudge";
type ActiveView = "cover-letter" | "resume" | string;

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useApplicationDetail(id);
  const { isAssetAllowed, canRefine, tier, isTrialExpired } = useSubscription();
  const { isAdmin } = useUserRoles();
  const [activeView, setActiveView] = useState<ActiveView>("resume");
  const { shouldNudge, dismiss: dismissNudge } = useCoverLetterNudge();
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Extracted hooks
  const {
    dynamicAssets, hasProposals, dynamicLoading,
    showProposalDialog, setShowProposalDialog,
    handleAssetsConfirmed, generateDynamicAsset, handleAssetUpdated,
  } = useDynamicAssets(id, {
    jobDescription: state.jobDescription,
    companyName: state.companyName,
    jobTitle: state.jobTitle,
    branding: state.app?.branding,
  });

  const {
    atsScore, atsLoading, handleAtsRescan, handleApplyBulletFix,
  } = useAtsAutoScore(id, state.resumeHtml, state.jobDescription, state.app, state.setResumeHtml, state.saveField);

  // Pipeline stage
  const currentStage = (state.app?.pipeline_stage || 'applied') as PipelineStage;

  const handleStageChange = async (newStage: string) => {
    if (!id) return;
    try {
      await updatePipelineStage(id, currentStage, newStage as PipelineStage);
      state.reload();
    } catch (err: unknown) {
      console.warn("Stage update failed:", err);
    }
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
        {/* Cover Letter Nudge Banner */}
        {shouldNudge && !nudgeDismissed && (
          <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1">
              <strong>Add your master cover letter</strong> to make every application sound like you. Without it, the AI generates a generic voice.
            </span>
            <Button size="sm" variant="default" onClick={() => navigate("/profile")}>
              Add Cover Letter
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { dismissNudge(); setNudgeDismissed(true); }}>
              Dismiss
            </Button>
          </div>
        )}
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

        {/* Unified Tab Strip */}
        <div data-tutorial="asset-tabs" className="flex items-center gap-0 border-b border-border pb-0 overflow-x-auto scrollbar-hide">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              data-tutorial={`${tab.id}-tab`}
              onClick={() => setActiveView(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeView === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}

          {/* Separator between core docs and industry materials */}
          {dynamicAssets.length > 0 && (
            <div className="h-5 w-px bg-border mx-1 shrink-0 -mb-px" />
          )}

          {/* Industry material tabs inline */}
          {dynamicAssets.length > 0 && (
            <div data-tutorial="industry-assets-grid" className="flex items-center gap-0">
              {dynamicAssets.map((asset) => (
                <div key={asset.id} className="flex items-center -mb-px">
                  <button
                    onClick={() => setActiveView(asset.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeView === asset.id
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate max-w-[120px]">{asset.asset_name}</span>
                    <div
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
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
                      <Button data-tutorial="change-asset-btn" variant="ghost" size="icon" className="h-6 w-6 shrink-0 -ml-1" title="Change document type">
                        <ArrowLeftRight className="h-3 w-3" />
                      </Button>
                    </ChangeAssetDialog>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Propose Materials ghost button at end of tab bar */}
          {dynamicAssets.length === 0 && !dynamicLoading && (
            <button
              onClick={() => setShowProposalDialog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors -mb-px whitespace-nowrap ml-1"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>+ Add Materials</span>
            </button>
          )}
        </div>

        {/* Prominent CTA when generation is complete but no industry materials yet */}
        {state.app.status === "complete" && dynamicAssets.length === 0 && !dynamicLoading && isPrimaryView && (
          <ProposeMaterialsCTA onPropose={() => setShowProposalDialog(true)} />
        )}

        {/* Admin: Design Variability Analysis */}
        {isAdmin && dynamicAssets.length >= 2 && (
          <DesignVariabilityCard
            appId={id!}
            dynamicAssets={dynamicAssets.map((a) => ({ id: a.id, asset_name: a.asset_name, html: a.html }))}
            branding={(state.app?.branding as Record<string, unknown>) ?? null}
            cachedVariability={state.app?.design_variability ?? null}
          />
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
                allAssets={dynamicAssets.map(a => ({ asset_name: a.asset_name, html: a.html }))}
                jobDescription={state.jobDescription}
                companyName={state.companyName}
                jobTitle={state.jobTitle}
                branding={state.app?.branding}
                onAssetUpdated={handleAssetUpdated}
                canRefine={canRefine}
                isPreviewOnly={tier === "free" || isTrialExpired}
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
