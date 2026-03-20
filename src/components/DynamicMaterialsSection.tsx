import { useState, useEffect, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Copy,
  Edit3,
  Loader2,
  Sparkles,
  RefreshCw,
  Download,
  FolderArchive,
} from "lucide-react";
import SaveAsTemplate from "@/components/SaveAsTemplate";
import DashboardRevisions from "@/components/DashboardRevisions";
import DesignVariabilityCard from "@/components/admin/DesignVariabilityCard";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardData } from "@/lib/dashboard/schema";
import { useProfiles } from "@/hooks/useProfiles";

interface GeneratedAsset {
  id: string;
  asset_name: string;
  brief_description: string | null;
  html: string;
  generation_status: string;
  generation_error: string | null;
  downloaded_at: string | null;
}

/** Fire-and-forget download signal insert */
async function recordDownloadSignal(applicationId: string, assetType: string, jobTitle: string) {
  try {
    const hash = assetType + '_' + Date.now().toString(36);
    await supabase.from("asset_download_signals").insert({
      application_id: applicationId,
      asset_type: assetType.trim().toLowerCase().replace(/[\s-]+/g, '_'),
      job_title: jobTitle || '',
      asset_html_hash: hash,
    });
  } catch { /* fire and forget */ }
}

function downloadHtmlFile(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface DynamicMaterialsSectionProps {
  applicationId: string;
  app: any;
  jobDescription: string;
  companyName: string;
  jobTitle: string;
  isBgGenerating: boolean;
  bgJob: any;
  dashboardHtml: string;
  dashboardData: DashboardData | null;
  setDashboardHtml: (h: string) => void;
  setDashboardData: (d: DashboardData | null) => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  chatInput: string;
  setChatInput: (v: string) => void;
  chatHistory: Array<{ role: string; content: string }>;
  setChatHistory: (v: Array<{ role: string; content: string }>) => void;
  isRefining: boolean;
  setIsRefining: (v: boolean) => void;
  isRegenerating: boolean;
  setIsRegenerating: (v: boolean) => void;
  previewHtml: string | null;
  setPreviewHtml: (v: string | null) => void;
  revisionTrigger: number;
  setRevisionTrigger: (fn: (t: number) => number) => void;
  iframeRef: RefObject<HTMLIFrameElement>;
  handleRegenerateDashboard: () => void;
  handleSendChat: () => void;
  handleDownloadZip: () => void;
  saveField: (fields: Record<string, any>) => Promise<void>;
  toast: (opts: any) => void;
}

export default function DynamicMaterialsSection({
  applicationId,
  app,
  jobDescription,
  companyName,
  jobTitle,
  isBgGenerating,
  bgJob,
  dashboardHtml,
  dashboardData,
  setDashboardHtml,
  setDashboardData,
  chatOpen,
  setChatOpen,
  chatInput,
  setChatInput,
  chatHistory,
  setChatHistory,
  isRefining,
  setIsRefining,
  isRegenerating,
  setIsRegenerating,
  previewHtml,
  setPreviewHtml,
  revisionTrigger,
  setRevisionTrigger,
  iframeRef,
  handleRegenerateDashboard,
  handleSendChat,
  handleDownloadZip,
  saveField,
  toast,
}: DynamicMaterialsSectionProps) {
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // Fetch generated assets
  useEffect(() => {
    if (!applicationId) return;
    const fetchAssets = async () => {
      const { data } = await supabase
        .from("generated_assets")
        .select("id, asset_name, brief_description, html, generation_status, generation_error, downloaded_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });
      setGeneratedAssets((data as GeneratedAsset[]) || []);
      setLoadingAssets(false);
    };
    fetchAssets();

    // Poll while generating
    const interval = setInterval(fetchAssets, 8000);
    return () => clearInterval(interval);
  }, [applicationId]);

  // Also check legacy columns for backward compat
  const legacyAssets: { name: string; html: string; field: string }[] = [];
  if (app?.raid_log_html) legacyAssets.push({ name: "RAID Log", html: app.raid_log_html, field: "raid_log_html" });
  if (app?.architecture_diagram_html) legacyAssets.push({ name: "Architecture Diagram", html: app.architecture_diagram_html, field: "architecture_diagram_html" });
  if (app?.roadmap_html) legacyAssets.push({ name: "90-Day Roadmap", html: app.roadmap_html, field: "roadmap_html" });

  const allMaterialTabs = [
    { value: "dashboard", label: "Dashboard" },
    ...generatedAssets.map((a) => ({
      value: `asset-${a.id}`,
      label: a.asset_name,
      asset: a,
    })),
    ...legacyAssets
      .filter((l) => !generatedAssets.some((a) => a.asset_name.toLowerCase() === l.name.toLowerCase()))
      .map((l) => ({
        value: `legacy-${l.field}`,
        label: l.name,
        legacy: l,
      })),
  ];

  return (
    <Tabs defaultValue="dashboard" className="space-y-4">
      <TabsList className="w-full justify-start flex-wrap">
        {allMaterialTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5">
            {tab.label}
            {('asset' in tab && tab.asset?.generation_status === 'generating') && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </TabsTrigger>
        ))}
        {isBgGenerating && generatedAssets.length === 0 && legacyAssets.length === 0 && (
          <TabsTrigger value="_loading" disabled className="flex items-center gap-1.5 opacity-50">
            <Loader2 className="h-3 w-3 animate-spin" /> Generating...
          </TabsTrigger>
        )}
      </TabsList>

      {/* Dashboard sub-tab */}
      <TabsContent value="dashboard" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)}>
            <Edit3 className="mr-2 h-4 w-4" /> {chatOpen ? "Hide Chat" : "Refine with AI"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRegenerateDashboard} disabled={isRegenerating}>
            {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Regenerate
          </Button>
          {dashboardHtml && (
            <>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(dashboardHtml); toast({ title: "Copied!", description: "Dashboard HTML copied." }); }}>
                <Copy className="mr-2 h-4 w-4" /> Copy HTML
              </Button>
              <SaveAsTemplate dashboardHtml={dashboardHtml} applicationId={applicationId} defaultLabel={`${companyName} ${jobTitle} Dashboard`.trim()} defaultJobFunction={jobTitle} defaultDepartment="" />
              {dashboardData ? (
                <Button variant="outline" size="sm" onClick={handleDownloadZip}><FolderArchive className="mr-2 h-4 w-4" /> Download ZIP</Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => {
                  downloadHtmlFile(dashboardHtml, `${(companyName || "dashboard").replace(/\s+/g, "-").toLowerCase()}-dashboard.html`);
                  recordDownloadSignal(applicationId, "dashboard", jobTitle);
                  toast({ title: "Downloaded" });
                }}><Download className="mr-2 h-4 w-4" /> Download HTML</Button>
              )}
            </>
          )}
        </div>

        {chatOpen && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`text-sm p-2 rounded ${msg.role === "user" ? "bg-primary/10 text-right" : "bg-muted"}`}>{msg.content}</div>
                ))}
                {isRefining && <div className="text-sm p-2 rounded bg-muted flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Refining...</div>}
              </div>
              <div className="flex gap-2">
                <Textarea placeholder='e.g. "Change colors to blue"' value={chatInput} onChange={(e) => setChatInput(e.target.value)} rows={2}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }} />
                <Button onClick={handleSendChat} disabled={!chatInput.trim() || isRefining} className="self-end">Send</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {applicationId && dashboardHtml && (
          <DashboardRevisions applicationId={applicationId} currentHtml={dashboardHtml} onPreviewRevision={(html) => setPreviewHtml(html === dashboardHtml ? null : html)} refreshTrigger={revisionTrigger} />
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
        ) : isBgGenerating ? (
          <Card><CardContent className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground font-medium">{bgJob?.progress || "Generating dashboard..."}</p>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No dashboard generated yet.</p>
            <Button onClick={handleRegenerateDashboard} disabled={isRegenerating}><Sparkles className="mr-2 h-4 w-4" /> Generate Dashboard</Button>
          </CardContent></Card>
        )}
      </TabsContent>

      {/* Dynamic generated assets */}
      {generatedAssets.map((asset) => (
        <TabsContent key={asset.id} value={`asset-${asset.id}`} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {asset.html && asset.generation_status === 'complete' && !asset.downloaded_at && (
              <Button variant="outline" size="sm" onClick={async () => {
                if (!jobDescription.trim()) return;
                toast({ title: `Regenerating ${asset.asset_name}...` });
                try {
                  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-material`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    },
                    body: JSON.stringify({
                      assetName: asset.asset_name,
                      assetDescription: asset.brief_description,
                      jobDescription,
                      companyName,
                      jobTitle,
                      competitors: app?.competitors,
                      products: app?.products,
                      customers: app?.customers,
                    }),
                  });
                  if (resp.ok) {
                    const data = await resp.json();
                    if (data.html) {
                      await supabase.from("generated_assets").update({ html: data.html }).eq("id", asset.id);
                      setGeneratedAssets(prev => prev.map(a => a.id === asset.id ? { ...a, html: data.html } : a));
                      toast({ title: `${asset.asset_name} regenerated!` });
                    }
                  }
                } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
              }}>
                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
              </Button>
            )}
            {asset.downloaded_at && (
              <Badge variant="secondary" className="text-xs">🔒 Downloaded — locked</Badge>
            )}
            {asset.html && (
              <Button variant="outline" size="sm" onClick={async () => {
                const slug = (companyName || asset.asset_name).replace(/\s+/g, "-").toLowerCase();
                const assetSlug = asset.asset_name.replace(/\s+/g, "-").toLowerCase();
                downloadHtmlFile(asset.html, `${slug}-${assetSlug}.html`);
                recordDownloadSignal(applicationId, asset.asset_name, jobTitle);
                // Mark as downloaded (locks regeneration)
                await supabase.from("generated_assets").update({ downloaded_at: new Date().toISOString() }).eq("id", asset.id);
                setGeneratedAssets(prev => prev.map(a => a.id === asset.id ? { ...a, downloaded_at: new Date().toISOString() } : a));
                toast({ title: "Downloaded" });
              }}><Download className="mr-2 h-4 w-4" /> Download HTML</Button>
            )}
          </div>
          {asset.brief_description && (
            <p className="text-sm text-muted-foreground">{asset.brief_description}</p>
          )}
          {asset.generation_status === 'complete' && asset.html ? (
            <Card className="overflow-hidden">
              <div className="w-full bg-white" style={{ height: "60vh" }}>
                <iframe srcDoc={asset.html} className="w-full h-full border-0" sandbox="allow-scripts" title={asset.asset_name} />
              </div>
            </Card>
          ) : asset.generation_status === 'generating' ? (
            <Card><CardContent className="py-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground font-medium">Generating {asset.asset_name}...</p>
            </CardContent></Card>
          ) : asset.generation_status === 'error' ? (
            <Card><CardContent className="py-12 text-center space-y-3">
              <p className="text-destructive font-medium">Generation failed</p>
              <p className="text-sm text-muted-foreground">{asset.generation_error}</p>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No content generated yet.</p>
            </CardContent></Card>
          )}
        </TabsContent>
      ))}

      {/* Legacy assets (backward compat) */}
      {legacyAssets
        .filter((l) => !generatedAssets.some((a) => a.asset_name.toLowerCase() === l.name.toLowerCase()))
        .map((legacy) => (
          <TabsContent key={`legacy-${legacy.field}`} value={`legacy-${legacy.field}`} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const slug = (companyName || legacy.name).replace(/\s+/g, "-").toLowerCase();
                const assetSlug = legacy.name.replace(/\s+/g, "-").toLowerCase();
                downloadHtmlFile(legacy.html, `${slug}-${assetSlug}.html`);
                recordDownloadSignal(applicationId, legacy.name, jobTitle);
                toast({ title: "Downloaded" });
              }}><Download className="mr-2 h-4 w-4" /> Download HTML</Button>
            </div>
            <Card className="overflow-hidden">
              <div className="w-full bg-white" style={{ height: "60vh" }}>
                <iframe srcDoc={legacy.html} className="w-full h-full border-0" sandbox="allow-scripts" title={legacy.name} />
              </div>
            </Card>
          </TabsContent>
        ))}
    </Tabs>
  );
}
