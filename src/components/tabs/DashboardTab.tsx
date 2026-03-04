import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Edit3, Copy, RefreshCw, Loader2, Download, FolderArchive, Sparkles,
} from "lucide-react";
import SaveAsTemplate from "@/components/SaveAsTemplate";
import DashboardRevisions from "@/components/DashboardRevisions";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { streamDashboardGeneration } from "@/lib/api/jobApplication";
import { saveDashboardRevision } from "@/lib/api/dashboardRevisions";
import { parseLlmJsonOutput, assembleDashboardHtml, getDashboardZipFiles } from "@/lib/dashboard/assembler";
import type { DashboardData } from "@/lib/dashboard/schema";
import type { ApplicationState } from "@/hooks/useApplicationDetail";
import { useAssetJob } from "@/hooks/useBackgroundJob";
import JSZip from "jszip";

interface DashboardTabProps {
  appId: string;
  state: ApplicationState;
}

export default function DashboardTab({ appId, state }: DashboardTabProps) {
  const { toast } = useToast();
  const {
    app, dashboardHtml, setDashboardHtml, dashboardData, setDashboardData,
    chatHistory, setChatHistory, jobDescription, companyName, jobTitle,
    saveField, isBgGenerating, bgJob,
  } = state;

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [revisionTrigger, setRevisionTrigger] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const assetJob = useAssetJob(appId, "dashboard");
  const isAssetJobActive = !!(assetJob && !["complete", "error"].includes(assetJob.status));

  const handleRegenerateDashboard = async () => {
    if (!jobDescription.trim()) return;

    // Save current as revision before regenerating
    if (dashboardHtml.trim()) {
      try {
        await saveDashboardRevision(appId, dashboardHtml, "Before regeneration");
        setRevisionTrigger((t) => t + 1);
      } catch (e) { console.warn("Failed to save dashboard revision:", e); }
    }

    // Start as background job
    await backgroundGenerator.startAssetJob({
      applicationId: appId,
      assetType: "dashboard",
      label: "Regenerating dashboard",
      dbField: "dashboard_html",
      runFn: async () => {
        let accumulated = "";
        await streamDashboardGeneration({
          jobDescription,
          branding: app?.branding,
          companyName,
          jobTitle,
          competitors: (app?.competitors as string[]) || [],
          customers: (app?.customers as string[]) || [],
          products: (app?.products as string[]) || [],
          onDelta: (text) => { accumulated += text; },
          onDone: () => {},
        });

        const parsed = parseLlmJsonOutput(accumulated);
        if (parsed) {
          const html = assembleDashboardHtml(parsed);
          return { html, extraFields: { dashboard_data: parsed } };
        }

        // Fallback: raw HTML cleanup
        let clean = accumulated;
        const htmlStart = clean.indexOf("<!DOCTYPE html>");
        const htmlStartAlt = clean.indexOf("<!doctype html>");
        const start = htmlStart !== -1 ? htmlStart : htmlStartAlt;
        if (start > 0) clean = clean.slice(start);
        const htmlEnd = clean.lastIndexOf("</html>");
        if (htmlEnd !== -1) clean = clean.slice(0, htmlEnd + 7);
        return { html: clean };
      },
      saveRevisionFn: saveDashboardRevision,
      revisionLabel: "Regenerated",
    });

    toast({ title: "Regenerating", description: "Dashboard regeneration started in background." });
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isRefining) return;
    const msg = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    setIsRefining(true);
    try {
      await backgroundGenerator.startRefinement({
        applicationId: appId,
        currentHtml: dashboardHtml,
        currentDashboardData: dashboardData || undefined,
        userMessage: msg,
        chatHistory: newHistory,
        jobUrl: app.job_url,
      });
      try {
        await saveDashboardRevision(appId, dashboardHtml, `Before: ${msg.slice(0, 50)}`);
        setRevisionTrigger((t) => t + 1);
      } catch (e) { console.warn("Failed to save dashboard revision:", e); }
      toast({ title: "Refining", description: "Dashboard refinement started in background." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setChatHistory((prev) => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
    } finally {
      setIsRefining(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!dashboardData) return;
    const files = getDashboardZipFiles(dashboardData);
    const zip = new JSZip();
    Object.entries(files).forEach(([name, content]) => zip.file(name, content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(companyName || "dashboard").replace(/\s+/g, "-").toLowerCase()}-dashboard.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Dashboard ZIP saved." });
  };

  const handleDownloadHtml = (html: string, filename: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)}>
          <Edit3 className="mr-2 h-4 w-4" /> {chatOpen ? "Hide Chat" : "Refine with AI"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRegenerateDashboard} disabled={isAssetJobActive}>
          {isAssetJobActive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Regenerate
        </Button>
        {dashboardHtml && (
          <>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(dashboardHtml);
              toast({ title: "Copied!", description: "Dashboard HTML copied to clipboard." });
            }}>
              <Copy className="mr-2 h-4 w-4" /> Copy HTML
            </Button>
            <SaveAsTemplate
              dashboardHtml={dashboardHtml} applicationId={appId} assetType="dashboard"
              defaultLabel={`${companyName} ${jobTitle} Dashboard`.trim()}
              defaultJobFunction={jobTitle} defaultDepartment=""
            />
            {dashboardData ? (
              <Button variant="outline" size="sm" onClick={handleDownloadZip}>
                <FolderArchive className="mr-2 h-4 w-4" /> Download ZIP
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleDownloadHtml(dashboardHtml, `${(companyName || "dashboard").replace(/\s+/g, "-").toLowerCase()}-dashboard.html`)}>
                <Download className="mr-2 h-4 w-4" /> Download HTML
              </Button>
            )}
          </>
        )}
      </div>

      {chatOpen && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`text-sm p-2 rounded ${msg.role === "user" ? "bg-primary/10 text-right" : "bg-muted"}`}>
                  {msg.content}
                </div>
              ))}
              {isRefining && (
                <div className="text-sm p-2 rounded bg-muted flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Refining...
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder='e.g. "Change colors to blue" or "Add a market share chart"'
                value={chatInput} onChange={(e) => setChatInput(e.target.value)} rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
              />
              <Button onClick={handleSendChat} disabled={!chatInput.trim() || isRefining} className="self-end">Send</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {appId && dashboardHtml && (
        <DashboardRevisions
          applicationId={appId} currentHtml={dashboardHtml}
          onPreviewRevision={(html) => setPreviewHtml(html === dashboardHtml ? null : html)}
          refreshTrigger={revisionTrigger}
        />
      )}

      {previewHtml && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">Previewing older version</Badge>
          <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>Back to current</Button>
        </div>
      )}

      {dashboardHtml ? (
        <Card className="overflow-hidden">
          <div className="w-full" style={{ height: "70vh" }}>
            <iframe ref={iframeRef} srcDoc={previewHtml || dashboardHtml} className="w-full h-full border-0" sandbox="allow-scripts" title="Dashboard Preview" />
          </div>
        </Card>
      ) : (isBgGenerating || isAssetJobActive) ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground font-medium">
              {assetJob?.progress || bgJob?.progress || "Generating dashboard..."}
            </p>
            <p className="text-xs text-muted-foreground">You can navigate away — generation continues in the background.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No dashboard generated yet.</p>
            <Button onClick={handleRegenerateDashboard} disabled={isAssetJobActive}>
              <Sparkles className="mr-2 h-4 w-4" /> Generate Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
