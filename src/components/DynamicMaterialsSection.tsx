import { useState, useEffect, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Copy,
  Edit3,
  Loader2,
  Sparkles,
  RefreshCw,
  Download,
  FolderArchive,
  Repeat2,
} from "lucide-react";
import SaveAsTemplate from "@/components/SaveAsTemplate";
import DashboardRevisions from "@/components/DashboardRevisions";
import GeneratedAssetRevisions from "@/components/GeneratedAssetRevisions";
import DesignVariabilityCard from "@/components/admin/DesignVariabilityCard";
import { supabase } from "@/integrations/supabase/client";
import { saveGeneratedAssetRevision } from "@/lib/api/generatedAssetRevisions";
import type { DashboardData } from "@/lib/dashboard/schema";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface GeneratedAsset {
  id: string;
  asset_name: string;
  brief_description: string | null;
  html: string;
  generation_status: string;
  generation_error: string | null;
  downloaded_at: string | null;
}

interface ProposedAsset {
  id: string;
  asset_name: string;
  brief_description: string;
  selected: boolean;
}

interface AiSuggestion {
  asset_name: string;
  brief_description: string;
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
  const { user } = useAuth();
  const { data: isAdmin } = useQuery({
    queryKey: ["user-role-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });

  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assetRevisionTriggers, setAssetRevisionTriggers] = useState<Record<string, number>>({});
  const [assetPreviewHtml, setAssetPreviewHtml] = useState<Record<string, string | null>>({});

  // Change Asset state
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapAssetId, setSwapAssetId] = useState<string | null>(null);
  const [swapAssetName, setSwapAssetName] = useState("");
  const [proposedAlternatives, setProposedAlternatives] = useState<ProposedAsset[]>([]);
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);
  const [selectedAiSuggestion, setSelectedAiSuggestion] = useState<AiSuggestion | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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

  const openSwapDialog = async (asset: GeneratedAsset) => {
    setSwapAssetId(asset.id);
    setSwapAssetName(asset.asset_name);
    setSelectedSwapId(null);

    // Fetch unselected proposed assets for this application
    const { data } = await supabase
      .from("proposed_assets")
      .select("id, asset_name, brief_description, selected")
      .eq("application_id", applicationId)
      .eq("selected", false)
      .order("created_at", { ascending: true });

    setProposedAlternatives((data as ProposedAsset[]) || []);
    setSwapDialogOpen(true);
  };

  const handleSwapAsset = async () => {
    if (!swapAssetId || !selectedSwapId) return;
    const currentAsset = generatedAssets.find((a) => a.id === swapAssetId);
    const newProposed = proposedAlternatives.find((p) => p.id === selectedSwapId);
    if (!currentAsset || !newProposed) return;

    setIsSwapping(true);
    try {
      // 1. Save current asset as revision
      if (currentAsset.html) {
        try {
          await saveGeneratedAssetRevision(applicationId, swapAssetId, currentAsset.html, `Before swap to ${newProposed.asset_name}`);
        } catch { /* non-critical */ }
      }

      // 2. Mark old proposed_asset as not selected, new one as selected
      await supabase.from("proposed_assets").update({ selected: false })
        .eq("application_id", applicationId)
        .eq("asset_name", currentAsset.asset_name);
      await supabase.from("proposed_assets").update({ selected: true })
        .eq("id", selectedSwapId);

      // 3. Update generated_assets row with new name/description, set to generating
      await supabase.from("generated_assets").update({
        asset_name: newProposed.asset_name,
        brief_description: newProposed.brief_description,
        html: '',
        generation_status: 'generating',
        generation_error: null,
      }).eq("id", swapAssetId);

      // 4. Trigger generation
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-material`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          assetName: newProposed.asset_name,
          assetDescription: newProposed.brief_description,
          jobDescription,
          companyName,
          jobTitle,
          competitors: app?.competitors,
          products: app?.products,
          customers: app?.customers,
          applicationId,
          variabilityRecommendations: app?.design_variability?.recommendations || [],
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.html) {
          await supabase.from("generated_assets").update({
            html: data.html,
            generation_status: 'complete',
          }).eq("id", swapAssetId);
        }
      }

      // 5. Refresh local state
      setGeneratedAssets((prev) =>
        prev.map((a) =>
          a.id === swapAssetId
            ? { ...a, asset_name: newProposed.asset_name, brief_description: newProposed.brief_description, generation_status: 'generating' }
            : a
        )
      );

      setSwapDialogOpen(false);
      toast({ title: "Asset swapped!", description: `Now generating "${newProposed.asset_name}".` });
      setAssetRevisionTriggers((prev) => ({ ...prev, [swapAssetId]: (prev[swapAssetId] || 0) + 1 }));
    } catch (e: any) {
      toast({ title: "Swap failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <>
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

        {/* Admin-only: Design Variability Card */}
        {isAdmin && generatedAssets.filter(a => a.generation_status === 'complete' && a.html).length >= 2 && (
          <DesignVariabilityCard
            appId={applicationId}
            assets={generatedAssets
              .filter(a => a.generation_status === 'complete' && a.html)
              .map(a => ({ assetName: a.asset_name, html: a.html }))}
            branding={app?.branding}
            cachedVariability={app?.design_variability}
          />
        )}

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
                <>
                  <Button variant="outline" size="sm" onClick={async () => {
                    if (!jobDescription.trim()) return;
                    toast({ title: `Regenerating ${asset.asset_name}...` });
                    try {
                      // Save revision before regeneration
                      try {
                        await saveGeneratedAssetRevision(applicationId, asset.id, asset.html, "Before regeneration");
                      } catch { /* non-critical */ }

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
                          applicationId,
                          variabilityRecommendations: app?.design_variability?.recommendations || [],
                        }),
                      });
                      if (resp.ok) {
                        const data = await resp.json();
                        if (data.html) {
                          await supabase.from("generated_assets").update({ html: data.html }).eq("id", asset.id);
                          setGeneratedAssets(prev => prev.map(a => a.id === asset.id ? { ...a, html: data.html } : a));
                          toast({ title: `${asset.asset_name} regenerated!` });
                          setAssetRevisionTriggers(prev => ({ ...prev, [asset.id]: (prev[asset.id] || 0) + 1 }));
                        }
                      }
                    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                  }}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openSwapDialog(asset)}>
                    <Repeat2 className="mr-2 h-4 w-4" /> Change Asset
                  </Button>
                </>
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
                  await supabase.from("generated_assets").update({ downloaded_at: new Date().toISOString() }).eq("id", asset.id);
                  setGeneratedAssets(prev => prev.map(a => a.id === asset.id ? { ...a, downloaded_at: new Date().toISOString() } : a));
                  toast({ title: "Downloaded" });
                }}><Download className="mr-2 h-4 w-4" /> Download HTML</Button>
              )}
            </div>
            {asset.brief_description && (
              <p className="text-sm text-muted-foreground">{asset.brief_description}</p>
            )}

            {/* Asset Revision History */}
            <GeneratedAssetRevisions
              assetId={asset.id}
              assetName={asset.asset_name}
              onPreviewRevision={(html) => setAssetPreviewHtml(prev => ({ ...prev, [asset.id]: html }))}
              refreshTrigger={assetRevisionTriggers[asset.id] || 0}
            />

            {assetPreviewHtml[asset.id] && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">Previewing older version</Badge>
                <Button variant="ghost" size="sm" onClick={() => setAssetPreviewHtml(prev => ({ ...prev, [asset.id]: null }))}>
                  Back to current
                </Button>
              </div>
            )}

            {asset.generation_status === 'complete' && asset.html ? (
              <Card className="overflow-hidden">
                <div className="w-full bg-white" style={{ height: "60vh" }}>
                  <iframe srcDoc={assetPreviewHtml[asset.id] || asset.html} className="w-full h-full border-0" sandbox="allow-scripts" title={asset.asset_name} />
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

      {/* Change Asset Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Asset</DialogTitle>
            <DialogDescription>
              Replace "{swapAssetName}" with a different material. The total number of materials stays the same.
            </DialogDescription>
          </DialogHeader>
          {proposedAlternatives.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No alternative materials available for this application.
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto py-2">
              {proposedAlternatives.map((alt) => (
                <div
                  key={alt.id}
                  onClick={() => setSelectedSwapId(alt.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedSwapId === alt.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <p className="font-medium text-sm">{alt.asset_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alt.brief_description}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSwapAsset}
              disabled={!selectedSwapId || isSwapping}
            >
              {isSwapping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Repeat2 className="mr-2 h-4 w-4" />}
              {isSwapping ? "Swapping…" : "Swap Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
