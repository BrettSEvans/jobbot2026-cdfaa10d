/**
 * DynamicAssetTab - Renders a single dynamic (AI-proposed) asset with full feature parity:
 * Generate, Refine with AI, PDF Download, Copy Text, Revision History.
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Edit3, RefreshCw, Loader2, FileDown, Sparkles, Copy, History, Eye,
} from "lucide-react";
import {
  streamDynamicAssetGeneration,
  streamRefineDynamicAsset,
  updateGeneratedAsset,
  saveDynamicAssetRevision,
  getDynamicAssetRevisions,
  type GeneratedAsset,
} from "@/lib/api/dynamicAssets";
import { extractStyleSignalsFromMessage } from "@/lib/api/stylePreferences";
import { cleanHtml } from "@/lib/cleanHtml";
import { downloadHtmlAsPdf, buildPdfFilename } from "@/lib/htmlToPdf";
import { getProfile } from "@/lib/api/profile";

interface DynamicAssetTabProps {
  asset: GeneratedAsset;
  jobDescription: string;
  companyName?: string;
  jobTitle?: string;
  branding?: any;
  onAssetUpdated: (updated: GeneratedAsset) => void;
}

export default function DynamicAssetTab({
  asset,
  jobDescription,
  companyName,
  jobTitle,
  branding,
  onAssetUpdated,
}: DynamicAssetTabProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Revision history
  const [revisions, setRevisions] = useState<any[]>([]);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [revisionTrigger, setRevisionTrigger] = useState(0);

  useEffect(() => {
    if (asset.html) loadRevisions();
  }, [asset.id, revisionTrigger]);

  const loadRevisions = async () => {
    setRevisionLoading(true);
    try {
      const data = await getDynamicAssetRevisions(asset.id);
      setRevisions(data);
    } catch { /* non-critical */ }
    finally { setRevisionLoading(false); }
  };

  const html = asset.html;

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "No job description", description: "A job description is needed.", variant: "destructive" });
      return;
    }

    // Save current as revision before regenerating
    if (html.trim()) {
      try {
        await saveDynamicAssetRevision(asset.id, asset.application_id, html, "Before regeneration");
        setRevisionTrigger((t) => t + 1);
      } catch (e) { console.warn("Failed to save revision:", e); }
    }

    setGenerating(true);
    try {
      await updateGeneratedAsset(asset.id, { generation_status: 'generating' } as any);

      let resumeText = "";
      try { resumeText = await getActiveResumeText(); } catch { }

      let accumulated = "";
      await streamDynamicAssetGeneration({
        assetName: asset.asset_name,
        briefDescription: asset.brief_description,
        jobDescription,
        resumeText,
        companyName,
        jobTitle,
        branding,
        onDelta: (text) => { accumulated += text; },
        onDone: () => {},
      });

      const cleaned = cleanHtml(accumulated);
      const updated = await updateGeneratedAsset(asset.id, {
        html: cleaned,
        generation_status: 'complete',
      } as any);
      onAssetUpdated(updated);

      // Save revision
      try {
        await saveDynamicAssetRevision(asset.id, asset.application_id, cleaned, "Generated");
        setRevisionTrigger((t) => t + 1);
      } catch { }

      toast({ title: "Generated!", description: `${asset.asset_name} has been generated.` });
    } catch (err: any) {
      await updateGeneratedAsset(asset.id, { generation_status: 'error', generation_error: err.message } as any);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");

    if (html.trim()) {
      try {
        await saveDynamicAssetRevision(asset.id, asset.application_id, html, `Before: ${msg.slice(0, 50)}`);
        setRevisionTrigger((t) => t + 1);
      } catch { }
    }

    setRefining(true);
    try {
      let accumulated = "";
      await streamRefineDynamicAsset({
        assetName: asset.asset_name,
        currentHtml: html,
        userMessage: msg,
        jobDescription,
        companyName,
        jobTitle,
        branding,
        onDelta: (text) => { accumulated += text; },
        onDone: () => {},
      });

      extractStyleSignalsFromMessage(msg);

      const cleaned = cleanHtml(accumulated);
      const updated = await updateGeneratedAsset(asset.id, { html: cleaned } as any);
      onAssetUpdated(updated);

      try {
        await saveDynamicAssetRevision(asset.id, asset.application_id, cleaned, `Refined: ${msg.slice(0, 50)}`);
        setRevisionTrigger((t) => t + 1);
      } catch { }

      toast({ title: "Refined!", description: `${asset.asset_name} has been updated.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRefining(false);
    }
  };

  const handleDownloadPdf = () => {
    const slug = asset.asset_name.replace(/\s+/g, '-').toLowerCase();
    const filename = buildPdfFilename(slug, companyName, jobTitle);
    downloadHtmlAsPdf(html, filename);
    toast({ title: "PDF export", description: "Print dialog opened — save as PDF." });
  };

  const handleCopyText = async () => {
    // Extract text from HTML
    const div = document.createElement("div");
    div.innerHTML = html;
    const text = div.textContent || div.innerText || "";
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${asset.asset_name} text copied to clipboard.` });
  };

  const handlePreviewRevision = (rev: any) => {
    if (previewingId === rev.id) {
      setPreviewingId(null);
      setPreviewHtml(null);
    } else {
      setPreviewingId(rev.id);
      setPreviewHtml(rev.html);
    }
  };

  const isWorking = generating || refining;

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)} disabled={!html}>
          <Edit3 className="mr-2 h-4 w-4" /> {chatOpen ? "Hide Chat" : "Refine with AI"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isWorking}>
          {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {html ? "Regenerate" : "Generate"}
        </Button>
        {html && (
          <>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <FileDown className="mr-2 h-4 w-4" /> PDF Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyText}>
              <Copy className="mr-2 h-4 w-4" /> Copy to Text
            </Button>
          </>
        )}
      </div>

      {/* Refine Chat */}
      {chatOpen && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {isWorking && (
              <div className="text-sm p-2 rounded bg-muted flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Processing...
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder={`e.g. "Make it more concise" or "Add a section about..."`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRefine(); }
                }}
              />
              <Button onClick={handleRefine} disabled={!chatInput.trim() || isWorking} className="self-end">
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revision History */}
      {revisions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              {asset.asset_name} History
              <Badge variant="secondary" className="text-xs">{revisions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {revisions.map((rev: any) => (
                  <div
                    key={rev.id}
                    className={`flex items-center justify-between p-2 rounded-md border text-sm transition-colors ${
                      previewingId === rev.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">v{rev.revision_number}</Badge>
                      <span className="truncate text-muted-foreground">{rev.label}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant={previewingId === rev.id ? "default" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handlePreviewRevision(rev)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Preview Banner */}
      {previewHtml && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">Previewing older version</Badge>
          <Button variant="ghost" size="sm" onClick={() => { setPreviewHtml(null); setPreviewingId(null); }}>
            Back to current
          </Button>
        </div>
      )}

      {/* Content Viewer */}
      {(previewHtml || html) ? (
        <Card className="overflow-hidden">
          <div className="w-full" style={{ height: "70vh" }}>
            <iframe
              srcDoc={previewHtml || html}
              className="w-full h-full border-0"
              sandbox="allow-scripts"
              title={`${asset.asset_name} Preview`}
            />
          </div>
        </Card>
      ) : isWorking ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground font-medium">Generating {asset.asset_name}...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2 font-medium">{asset.asset_name}</p>
            <p className="text-sm text-muted-foreground mb-4">{asset.brief_description}</p>
            <Button onClick={handleGenerate} disabled={isWorking}>
              <Sparkles className="mr-2 h-4 w-4" /> Generate {asset.asset_name}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
