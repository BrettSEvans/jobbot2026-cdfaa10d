/**
 * DynamicAssetTab - Renders a single dynamic (AI-proposed) asset with full feature parity:
 * Generate, Vibe Edit, PDF Download, Copy Text, Revision History.
 * After download, regeneration/refinement/swap are locked.
 * In preview mode (free tier), buttons are disabled with upgrade tooltips and content is watermarked.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Edit3, RefreshCw, Loader2, FileDown, Sparkles, Copy, History, Eye, HelpCircle, Lock, Crown,
} from "lucide-react";
import {
  streamDynamicAssetGeneration,
  streamRefineDynamicAsset,
  updateGeneratedAsset,
  saveDynamicAssetRevision,
  getDynamicAssetRevisions,
  markAssetDownloaded,
  type GeneratedAsset,
} from "@/lib/api/dynamicAssets";
import { extractStyleSignalsFromMessage } from "@/lib/api/stylePreferences";
import { cleanHtml } from "@/lib/cleanHtml";
import { downloadHtmlAsPdf, buildPdfFilename } from "@/lib/htmlToPdf";
import { getActiveResumeText } from "@/lib/api/profile";
import { getLayoutStyleForAsset } from "@/lib/assetLayoutStyles";
import { injectWatermark } from "@/lib/watermarkHtml";
import VibeEditInfo from "@/components/VibeEditInfo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DynamicAssetTabProps {
  asset: GeneratedAsset;
  allAssetNames: string[];
  jobDescription: string;
  companyName?: string;
  jobTitle?: string;
  branding?: import('@/integrations/supabase/types').Json;
  onAssetUpdated: (updated: GeneratedAsset) => void;
  canRefine?: boolean;
  /** When true, all edit actions are disabled and content is watermarked (free tier preview) */
  isPreviewOnly?: boolean;
}

export default function DynamicAssetTab({
  asset,
  allAssetNames,
  jobDescription,
  companyName,
  jobTitle,
  branding,
  onAssetUpdated,
  canRefine: canRefineProp = true,
  isPreviewOnly = false,
}: DynamicAssetTabProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const isDownloaded = !!asset.downloaded_at;
  const isDashboardType = asset.asset_name.toLowerCase().includes("dashboard");

  // Upgrade popover component for locked actions
  const UpgradePopover = ({ children }: { children: React.ReactNode }) => (
    <Popover>
      <PopoverTrigger asChild>
        <span className="cursor-pointer">{children}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <span className="font-medium">Upgrade Required</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This feature is available with a Pro or Premium subscription. Would you like access?
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigate("/pricing")}>
              View Plans
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

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
    if (isDownloaded) return;
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
      await updateGeneratedAsset(asset.id, { generation_status: 'generating' });

      let resumeText = "";
      try { resumeText = await getActiveResumeText(); } catch { }

      const layoutStyle = getLayoutStyleForAsset(asset.asset_name, allAssetNames);
      let accumulated = "";
      await streamDynamicAssetGeneration({
        assetName: asset.asset_name,
        briefDescription: asset.brief_description,
        jobDescription,
        resumeText,
        companyName,
        jobTitle,
        branding,
        layoutStyle,
        onDelta: (text) => { accumulated += text; },
        onDone: () => {},
      });

      const cleaned = cleanHtml(accumulated);
      const updated = await updateGeneratedAsset(asset.id, {
        html: cleaned,
        generation_status: 'complete',
      });
      onAssetUpdated(updated);

      // Save revision
      try {
        await saveDynamicAssetRevision(asset.id, asset.application_id, cleaned, "Generated");
        setRevisionTrigger((t) => t + 1);
      } catch { }

      toast({ title: "Generated!", description: `${asset.asset_name} has been generated.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await updateGeneratedAsset(asset.id, { generation_status: 'error', generation_error: message });
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (isDownloaded) return;
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
      const layoutStyle = getLayoutStyleForAsset(asset.asset_name, allAssetNames);
      let accumulated = "";
      await streamRefineDynamicAsset({
        assetName: asset.asset_name,
        currentHtml: html,
        userMessage: msg,
        jobDescription,
        companyName,
        jobTitle,
        branding,
        layoutStyle,
        onDelta: (text) => { accumulated += text; },
        onDone: () => {},
      });

      extractStyleSignalsFromMessage(msg);

      const cleaned = cleanHtml(accumulated);
      const updated = await updateGeneratedAsset(asset.id, { html: cleaned });
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

  const handleDownloadPdf = async () => {
    const slug = asset.asset_name.replace(/\s+/g, '-').toLowerCase();
    const filename = buildPdfFilename(slug, companyName, jobTitle);
    downloadHtmlAsPdf(html, filename);
    toast({ title: "PDF export", description: "Print dialog opened — save as PDF." });

    // Mark as downloaded to lock regeneration/refinement
    if (!isDownloaded) {
      try {
        const updated = await markAssetDownloaded(asset.id);
        onAssetUpdated(updated);
      } catch (e) { console.warn("Failed to mark as downloaded:", e); }
    }
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
      {/* Download Lock Banner */}
      {isDownloaded && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-muted bg-muted/50 text-sm">
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            This document has been downloaded. Create a new application to generate fresh materials.
          </span>
        </div>
      )}

      {/* Preview Mode Banner */}
      {isPreviewOnly && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm">
          <Crown className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground">
            Preview mode — upgrade to Pro or Premium to edit, download, and remove the watermark.
          </span>
          <Button size="sm" variant="default" className="ml-auto" onClick={() => navigate("/pricing")}>
            Upgrade
          </Button>
        </div>
      )}

      {/* Dashboard Hosting Help */}
      {isDashboardType && html && !isPreviewOnly && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-accent bg-accent/30 text-sm">
          <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span className="text-foreground">
            To share this dashboard, download the files and host them on a free static site like{" "}
            <a
              href="https://pages.edgeone.ai/drop"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 font-medium"
            >
              pages.edgeone.ai/drop
            </a>
          </span>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        {/* Vibe Edit Button */}
        {isPreviewOnly ? (
          <UpgradePopover>
            <Button variant="outline" size="sm" disabled className="opacity-60">
              <Edit3 className="mr-2 h-4 w-4" />
              Vibe Edit
              <Lock className="ml-2 h-3 w-3" />
            </Button>
          </UpgradePopover>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    data-tutorial="refine-ai-btn"
                    variant="outline"
                    size="sm"
                    onClick={() => setChatOpen(!chatOpen)}
                    disabled={!html || !canRefineProp || isDownloaded}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    {isDownloaded ? "Locked" : !canRefineProp ? "Upgrade to Vibe Edit" : chatOpen ? "Hide Chat" : "Vibe Edit"}
                  </Button>
                </span>
              </TooltipTrigger>
              {isDownloaded && (
                <TooltipContent>Asset locked after download</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
        {!isPreviewOnly && <VibeEditInfo assetType="dynamic" />}

        {/* Regenerate Button */}
        {isPreviewOnly ? (
          <UpgradePopover>
            <Button variant="outline" size="sm" disabled className="opacity-60">
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
              <Lock className="ml-2 h-3 w-3" />
            </Button>
          </UpgradePopover>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    data-tutorial="generate-btn"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isWorking || isDownloaded}
                  >
                    {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {html ? "Regenerate" : "Generate"}
                  </Button>
                </span>
              </TooltipTrigger>
              {isDownloaded && (
                <TooltipContent>Asset locked after download</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}

        {html && (
          <>
            {/* PDF Download Button */}
            {isPreviewOnly ? (
              <UpgradePopover>
                <Button variant="outline" size="sm" disabled className="opacity-60">
                  <FileDown className="mr-2 h-4 w-4" /> PDF Download
                  <Lock className="ml-2 h-3 w-3" />
                </Button>
              </UpgradePopover>
            ) : (
              <Button data-tutorial="download-btn" variant="outline" size="sm" onClick={handleDownloadPdf}>
                <FileDown className="mr-2 h-4 w-4" /> PDF Download
              </Button>
            )}

            {/* Copy to Text Button */}
            {isPreviewOnly ? (
              <UpgradePopover>
                <Button variant="outline" size="sm" disabled className="opacity-60">
                  <Copy className="mr-2 h-4 w-4" /> Copy to Text
                  <Lock className="ml-2 h-3 w-3" />
                </Button>
              </UpgradePopover>
            ) : (
              <Button variant="outline" size="sm" onClick={handleCopyText}>
                <Copy className="mr-2 h-4 w-4" /> Copy to Text
              </Button>
            )}
          </>
        )}
      </div>

      {/* Refine Chat */}
      {chatOpen && !isDownloaded && (
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
        <Card data-tutorial="revision-history">
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
