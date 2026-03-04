/**
 * Generic tab for HTML-based assets (Executive Report, RAID Log, Architecture Diagram, Roadmap).
 * Eliminates 4 near-identical tab sections from ApplicationDetail.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Edit3, Copy, RefreshCw, Loader2, Download, Sparkles, FileDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SaveAsTemplate from "@/components/SaveAsTemplate";
import AssetRevisions from "@/components/AssetRevisions";
import { streamRefineAsset, type RefinableAssetType } from "@/lib/api/refineAsset";
import { extractStyleSignalsFromMessage } from "@/lib/api/stylePreferences";
import { cleanHtml } from "@/lib/cleanHtml";
import { downloadHtmlAsPdf, buildPdfFilename } from "@/lib/htmlToPdf";
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
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [revisionTrigger, setRevisionTrigger] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

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
    setIsGenerating(true);
    setHtml("");
    try {
      let accumulated = "";
      await generateFn({
        jobDescription, companyName, jobTitle,
        competitors: app?.competitors || [], customers: app?.customers || [],
        products: app?.products || [], department: "", branding: app?.branding,
        onDelta: (text: string) => { accumulated += text; setHtml(accumulated); },
        onDone: () => {},
      });
      const clean = cleanHtml(accumulated);
      setHtml(clean);
      await saveField({ [dbField]: clean });
      try {
        await saveRevisionFn(appId, clean, "Regenerated");
        setRevisionTrigger((t) => t + 1);
      } catch (e) { console.warn("Failed to save revision:", e); }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    setIsRefining(true);
    try {
      if (html.trim()) {
        try {
          await saveRevisionFn(appId, html, `Before: ${msg.slice(0, 50)}`);
          setRevisionTrigger((t) => t + 1);
        } catch (e) { console.warn("Failed to save revision:", e); }
      }
      let accumulated = "";
      await streamRefineAsset({
        assetType, currentHtml: html, userMessage: msg,
        jobDescription, companyName, jobTitle, branding: app?.branding,
        onDelta: (text) => { accumulated += text; setHtml(accumulated); },
        onDone: () => {},
      });
      const clean = cleanHtml(accumulated);
      setHtml(clean);
      await saveField({ [dbField]: clean });
      try {
        await saveRevisionFn(appId, clean, `Refined: ${msg.slice(0, 50)}`);
        setRevisionTrigger((t) => t + 1);
      } catch (e) { console.warn("Failed to save revision:", e); }
      // Extract style signals from the user's message (fire-and-forget)
      extractStyleSignalsFromMessage(msg);
      toast({ title: "Refined!", description: `${label} updated successfully.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsRefining(false);
    }
  };

  const handleDownloadPdf = () => {
    const filename = buildPdfFilename(assetType, companyName, jobTitle);
    downloadHtmlAsPdf(html, filename);
    toast({ title: "PDF export", description: "Print dialog opened — save as PDF." });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)}>
          <Edit3 className="mr-2 h-4 w-4" /> {chatOpen ? "Hide Chat" : "Refine with AI"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {html ? "Regenerate" : "Generate"} {label}
        </Button>
        {html && (
          <>
            <Button variant="outline" size="sm" onClick={() => handleCopy(html, `${label} HTML`)}>
              <Copy className="mr-2 h-4 w-4" /> Copy HTML
            </Button>
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
            {isRefining && (
              <div className="text-sm p-2 rounded bg-muted flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Refining...
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder={refinePlaceholder}
                value={chatInput} onChange={(e) => setChatInput(e.target.value)} rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRefine(); } }}
              />
              <Button onClick={handleRefine} disabled={!chatInput.trim() || isRefining} className="self-end">Send</Button>
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

      {(previewHtml || html) ? (
        <Card className="overflow-hidden">
          <div className="w-full" style={{ height: "70vh" }}>
            <iframe srcDoc={previewHtml || html} className="w-full h-full border-0" sandbox="allow-scripts" title={`${label} Preview`} />
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyIcon className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No {label.toLowerCase()} generated yet.</p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles className="mr-2 h-4 w-4" /> Generate {label}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
