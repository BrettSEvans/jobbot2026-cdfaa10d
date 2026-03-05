/**
 * Generic tab for HTML-based assets (Executive Report, RAID Log, Architecture Diagram, Roadmap, Resume).
 * Generate and refine operations run as background jobs that survive navigation.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Edit3, RefreshCw, Loader2, Download, Sparkles, FileDown, Check, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import WysiwygEditor from "@/components/WysiwygEditor";
import SaveAsTemplate from "@/components/SaveAsTemplate";
import AssetRevisions from "@/components/AssetRevisions";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { streamRefineAsset, type RefinableAssetType } from "@/lib/api/refineAsset";
import { extractStyleSignalsFromMessage } from "@/lib/api/stylePreferences";
import { cleanHtml } from "@/lib/cleanHtml";
import { downloadHtmlAsPdf, buildPdfFilename } from "@/lib/htmlToPdf";
import { useAssetJob } from "@/hooks/useBackgroundJob";
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
}

export default function HtmlAssetTab({
  appId, state, assetType, label, dbField, html, setHtml,
  generateFn, saveRevisionFn, emptyIcon: EmptyIcon, refinePlaceholder,
}: HtmlAssetTabProps) {
  const { toast } = useToast();
  const { app, jobDescription, companyName, jobTitle, saveField, handleCopy } = state;

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [revisionTrigger, setRevisionTrigger] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editHtml, setEditHtml] = useState("");

  const assetJob = useAssetJob(appId, assetType);
  const isAssetJobActive = !!(assetJob && !["complete", "error"].includes(assetJob.status));

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
        // Fire-and-forget style signal extraction
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button data-tutorial="refine-ai-btn" variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)}>
          <Edit3 className="mr-2 h-4 w-4" /> {chatOpen ? "Hide Chat" : "Refine with AI"}
        </Button>
        {html && (
          <Button variant="outline" size="sm" onClick={() => { if (!editing) setEditHtml(html); setEditing(!editing); }}>
            <Edit3 className="mr-2 h-4 w-4" /> {editing ? "Cancel Edit" : "Edit"}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isAssetJobActive}>
          {isAssetJobActive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {html ? "Regenerate" : "Generate"} {label}
        </Button>
        {html && (
          <>
            <SaveAsTemplate
              dashboardHtml={html} applicationId={appId} assetType={assetType}
              defaultLabel={`${companyName} ${jobTitle} ${label}`.trim()}
              defaultJobFunction={jobTitle} defaultDepartment=""
            />
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <FileDown className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          </>
        )}
      </div>

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

      {html && (
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
            <WysiwygEditor content={editHtml} onChange={setEditHtml} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { setHtml(editHtml); saveField({ [dbField]: editHtml }); setEditing(false); }}>
                <Check className="mr-2 h-4 w-4" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="mr-2 h-4 w-4" /> Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (previewHtml || html) ? (
        <Card className="overflow-hidden">
          <div className="w-full" style={{ height: "70vh" }}>
            <iframe srcDoc={previewHtml || html} className="w-full h-full border-0" sandbox="allow-scripts" title={`${label} Preview`} />
          </div>
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
