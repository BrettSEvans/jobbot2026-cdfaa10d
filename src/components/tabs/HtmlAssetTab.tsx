/**
 * Generic tab for HTML-based assets (Executive Report, RAID Log, Architecture Diagram, Roadmap, Resume).
 * Generate and refine operations run as background jobs that survive navigation.
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { downloadHtmlAsDocx, buildDocxFilename } from "@/lib/docxExport";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Loader2, Sparkles, Check, X, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import InlineHtmlEditor from "@/components/InlineHtmlEditor";
import GenerationErrorBanner from "@/components/GenerationErrorBanner";
import SaveAsTemplate from "@/components/SaveAsTemplate";
import AssetRevisions from "@/components/AssetRevisions";
import AssetActionBar from "@/components/tabs/AssetActionBar";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { streamRefineAsset, type RefinableAssetType } from "@/lib/api/refineAsset";
import { extractStyleSignalsFromMessage } from "@/lib/api/stylePreferences";
import { cleanHtml } from "@/lib/cleanHtml";
import { downloadHtmlAsPdf, buildPdfFilename } from "@/lib/htmlToPdf";
import { useAssetJob } from "@/hooks/useBackgroundJob";
import GenerationProgressBar, { type PipelineStage } from "@/components/GenerationProgressBar";
import type { ApplicationState } from "@/hooks/useApplicationDetail";

interface HtmlAssetTabProps {
  appId: string;
  state: ApplicationState;
  assetType: RefinableAssetType;
  label: string;
  dbField: string;
  html: string;
  setHtml: (v: string) => void;
  generateFn: (params: any) => Promise<void>;
  saveRevisionFn: (appId: string, html: string, label: string) => Promise<any>;
  emptyIcon: LucideIcon;
  refinePlaceholder: string;
  canRefine?: boolean;
}

export default function HtmlAssetTab({
  appId, state, assetType, label, dbField, html, setHtml,
  generateFn, saveRevisionFn, emptyIcon: EmptyIcon, refinePlaceholder, canRefine: canRefineProp = true,
}: HtmlAssetTabProps) {
  const { toast } = useToast();
  const { tier } = useSubscription();
  const { app, jobDescription, companyName, jobTitle, saveField, handleCopy } = state;

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [revisionTrigger, setRevisionTrigger] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editHtml, setEditHtml] = useState("");

  const assetJob = useAssetJob(appId, assetType);
  const isAssetJobActive = !!(assetJob && !["complete", "error"].includes(assetJob.status));

  const pipelineJob = state.bgJob;
  const isPipelineActive = state.isBgGenerating;
  const pipelineStage = (pipelineJob?.status || "pending") as PipelineStage;
  const showPipelineProgress = isPipelineActive && !html;

  const [missingResumeText, setMissingResumeText] = useState(false);
  useEffect(() => {
    if (assetType !== "resume") return;
    let cancelled = false;
    import("@/lib/api/profile").then(({ getProfile }) =>
      getProfile().then((p) => {
        if (!cancelled) setMissingResumeText(!p?.resume_text?.trim());
      })
    ).catch(() => {});
    return () => { cancelled = true; };
  }, [assetType]);

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "No job description", description: `A job description is needed to generate a ${label.toLowerCase()}.`, variant: "destructive" });
      return;
    }
    if (html.trim()) {
      try {
        await saveRevisionFn(appId, html, "Before regeneration");
        setRevisionTrigger((t) => t + 1);
      } catch (e) { console.warn("Failed to save revision:", e); }
    }

    await backgroundGenerator.startAssetJob({
      applicationId: appId,
      assetType,
      label: `Generating ${label}`,
      dbField,
      runFn: async () => {
        let accumulated = "";
        await generateFn({
          jobDescription, companyName, jobTitle,
          competitors: app?.competitors || [], customers: app?.customers || [],
          products: app?.products || [], department: "", branding: app?.branding,
          onDelta: (text: string) => { accumulated += text; },
          onDone: () => {},
        });
        return { html: cleanHtml(accumulated) };
      },
      saveRevisionFn,
      revisionLabel: "Regenerated",
    });

    toast({ title: "Generating", description: `${label} generation started in background.` });
  };

  const handleRefine = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");

    if (html.trim()) {
      try {
        await saveRevisionFn(appId, html, `Before: ${msg.slice(0, 50)}`);
        setRevisionTrigger((t) => t + 1);
      } catch (e) { console.warn("Failed to save revision:", e); }
    }

    await backgroundGenerator.startAssetJob({
      applicationId: appId,
      assetType,
      label: `Refining ${label}`,
      dbField,
      runFn: async () => {
        let accumulated = "";
        await streamRefineAsset({
          assetType, currentHtml: html, userMessage: msg,
          jobDescription, companyName, jobTitle, branding: app?.branding,
          onDelta: (text) => { accumulated += text; },
          onDone: () => {},
        });
        extractStyleSignalsFromMessage(msg);
        return { html: cleanHtml(accumulated) };
      },
      saveRevisionFn,
      revisionLabel: `Refined: ${msg.slice(0, 50)}`,
    });

    toast({ title: "Refining", description: `${label} refinement started in background.` });
  };

  const handleDownloadPdf = () => {
    const filename = buildPdfFilename(assetType, companyName, jobTitle);
    downloadHtmlAsPdf(html, filename);
    toast({ title: "PDF export", description: "Print dialog opened — save as PDF." });
  };

  const handleDownloadDocx = async () => {
    const filename = buildDocxFilename(assetType, companyName, jobTitle);
    try {
      await downloadHtmlAsDocx(html, filename);
      toast({ title: "DOCX export", description: "Download started." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const showDocx = (assetType === "resume" || (assetType as string) === "cover_letter") && tier !== "free";

  return (
    <div className="space-y-4">
      {/* Generation error banner */}
      {assetJob?.status === "error" && (
        <GenerationErrorBanner
          error={assetJob.progress || null}
          status="error"
          onRetry={handleGenerate}
          retrying={isAssetJobActive}
          assetLabel={label}
        />
      )}

      {assetType === "resume" && missingResumeText && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No baseline resume found</AlertTitle>
          <AlertDescription>
            Your profile doesn't have resume text yet. Without it, the AI will fabricate a resume instead of tailoring yours.{" "}
            <Link to="/profile" className="underline font-medium">
              Upload a PDF on your Profile page
            </Link>{" "}
            to get accurate, personalized results.
          </AlertDescription>
        </Alert>
      )}

      {/* Unified Action Bar */}
      <AssetActionBar
        hasContent={!!html}
        assetType={assetType}
        label={label}
        onDownloadPdf={handleDownloadPdf}
        onDownloadDocx={handleDownloadDocx}
        showDocx={showDocx}
        onVibeEdit={() => setChatOpen(!chatOpen)}
        vibeEditOpen={chatOpen}
        canRefine={canRefineProp}
        onEdit={() => { if (!editing) setEditHtml(html); setEditing(!editing); }}
        isEditing={editing}
        onRegenerate={handleGenerate}
        onCopy={() => handleCopy(html, label)}
        onToggleRevisions={() => setShowRevisions(!showRevisions)}
        onSaveAsTemplate={
          html ? (
            <SaveAsTemplate
              dashboardHtml={html} applicationId={appId} assetType={assetType}
              defaultLabel={`${companyName} ${jobTitle} ${label}`.trim()}
              defaultJobFunction={jobTitle} defaultDepartment=""
            />
          ) : undefined
        }
        isGenerating={isAssetJobActive}
      />

      {/* Vibe Edit Chat */}
      {chatOpen && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {isAssetJobActive && (
              <div className="text-sm p-2 rounded bg-muted flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> {assetJob?.progress || "Processing..."}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder={refinePlaceholder}
                value={chatInput} onChange={(e) => setChatInput(e.target.value)} rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRefine(); } }}
              />
              <Button onClick={handleRefine} disabled={!chatInput.trim() || isAssetJobActive} className="self-end">Send</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revision History (toggled from overflow menu) */}
      {showRevisions && html && (
        <AssetRevisions
          applicationId={appId} assetType={assetType} currentHtml={html}
          onPreviewRevision={(h) => setPreviewHtml(h === html ? null : h)}
          refreshTrigger={revisionTrigger}
        />
      )}

      {previewHtml && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">Previewing older version</Badge>
          <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>Back to current</Button>
        </div>
      )}

      {editing ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={() => { setHtml(editHtml); saveField({ [dbField]: editHtml }); setEditing(false); }}>
                <Check className="mr-2 h-4 w-4" /> Save
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setEditing(false)}>
                <X className="mr-2 h-4 w-4" /> Discard
              </Button>
            </div>
            <InlineHtmlEditor html={editHtml} onChange={setEditHtml} />
          </CardContent>
        </Card>
      ) : (previewHtml || html) ? (
        <Card className="overflow-hidden">
          <div className="w-full" style={{ height: "70vh" }}>
            <iframe srcDoc={previewHtml || html} className="w-full h-full border-0" sandbox="allow-scripts" title={`${label} Preview`} />
          </div>
        </Card>
      ) : showPipelineProgress ? (
        <Card>
          <CardContent className="py-8 space-y-4">
            <GenerationProgressBar
              currentStage={pipelineStage}
              startedAt={pipelineJob?.startedAt}
            />
            <p className="text-xs text-muted-foreground text-center">You can navigate away — generation continues in the background.</p>
          </CardContent>
        </Card>
      ) : isAssetJobActive ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground font-medium">{assetJob?.progress || `Generating ${label.toLowerCase()}...`}</p>
            <p className="text-xs text-muted-foreground">You can navigate away — generation continues in the background.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyIcon className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No {label.toLowerCase()} generated yet.</p>
            <Button onClick={handleGenerate} disabled={isAssetJobActive}>
              <Sparkles className="mr-2 h-4 w-4" /> Generate {label}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
