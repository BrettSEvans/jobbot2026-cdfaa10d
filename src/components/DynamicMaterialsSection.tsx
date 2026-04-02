import { useState, useEffect, useRef, useCallback, RefObject } from "react";
import DashboardCustomizationDialog from "@/components/DashboardCustomizationDialog";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
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
import VersionDownloadAlert from "@/components/VersionDownloadAlert";
import DesignVariabilityCard from "@/components/admin/DesignVariabilityCard";
import PublishDashboard from "@/components/live-dashboard/PublishDashboard";
import DashboardRenderer from "@/components/live-dashboard/DashboardRenderer";
import DashboardChatbot from "@/components/live-dashboard/DashboardChatbot";
import { supabase } from "@/integrations/supabase/client";
import { saveGeneratedAssetRevision } from "@/lib/api/generatedAssetRevisions";
import { streamRefineMaterial } from "@/lib/api/jobApplication";
import { buildFileName } from "@/lib/fileNaming";
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

/** Inject one-page guard CSS into HTML for vibe-edited content */
function injectOnePageGuard(html: string): string {
  if (html.includes('lovable-one-page-guard')) return html;
  const guardCss = `<style id="lovable-one-page-guard">
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; }
  html, body { width: 8.5in !important; height: 11in !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
  body > * { height: auto !important; max-height: none !important; }
  .page-shell { width: 100% !important; height: 100% !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; padding: 0.4in 0.5in 0.32in !important; }
  .page-content { flex: 1 1 auto !important; min-height: 0 !important; overflow: hidden !important; }
  .page-content * { overflow: hidden !important; }
  .page-content *:not(svg *) { position: static !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important; transform: none !important; }
  .page-content [style*="position: relative"], .page-content [style*="position:relative"] { position: relative !important; }
  .page-content header, .page-content .header, .page-content [class*="header"], .page-content [class*="banner"] { position: relative !important; overflow: hidden !important; width: 100% !important; }
  .page-content header *, .page-content .header *, .page-content [class*="header"] * { position: static !important; max-width: 100% !important; word-wrap: break-word !important; }
  .page-content div, .page-content section { margin-top: 0 !important; margin-bottom: 0.08in !important; }
  .page-footer { flex: 0 0 auto !important; position: static !important; }
  footer, [class*="footer"] { position: static !important; }
</style>`;
  return html.replace('</head>', `${guardCss}\n</head>`);
}

/** Fit-to-page preview: scales iframe to show full US Letter page without scrolling */
function FitPagePreview({ html, title }: { html: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const PAGE_W = 816; // 8.5in @ 96dpi
  const PAGE_H = 1056; // 11in @ 96dpi

  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      setScale(Math.min(containerWidth / PAGE_W, 1));
    }
  }, []);

  useEffect(() => {
    updateScale();
    const obs = new ResizeObserver(updateScale);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [updateScale]);

  return (
    <Card className="overflow-hidden border">
      <div ref={containerRef} className="w-full bg-white" style={{ height: `${PAGE_H * scale}px`, overflow: 'hidden', position: 'relative' }}>
        <iframe
          srcDoc={html}
          className="border-0"
          style={{
            width: `${PAGE_W}px`,
            height: `${PAGE_H}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          sandbox="allow-scripts"
          title={title}
        />
      </div>
    </Card>
  );
}


function downloadMaterialPdf(html: string, _filename: string) {
  const printCss = `
    <style>
      @page { size: letter; margin: 0; }
      @media print {
        body { margin: 0; padding: 0.5in; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  `;
  const injected = html.replace('</head>', `${printCss}</head>`);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(injected);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 600);
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

  const { data: candidateProfile } = useQuery({
    queryKey: ["candidate-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("first_name, middle_name, last_name").eq("id", user!.id).single();
      return data;
    },
  });
  const candidateName = candidateProfile ? [candidateProfile.first_name, candidateProfile.middle_name, candidateProfile.last_name].filter(Boolean).join(" ") : "";

  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [showDashboardWelcome, setShowDashboardWelcome] = useState(() => !localStorage.getItem("dashboard-welcome-dismissed"));
  const [showDashboardConfig, setShowDashboardConfig] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assetRevisionTriggers, setAssetRevisionTriggers] = useState<Record<string, number>>({});
  const [assetPreviewHtml, setAssetPreviewHtml] = useState<Record<string, string | null>>({});
  const [versionAlertAction, setVersionAlertAction] = useState<(() => void) | null>(null);

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

  // Vibe Edit state (per asset)
  const [assetChatOpen, setAssetChatOpen] = useState<Record<string, boolean>>({});
  const [assetChatInput, setAssetChatInput] = useState<Record<string, string>>({});
  const [assetChatHistory, setAssetChatHistory] = useState<Record<string, Array<{ role: string; content: string }>>>({});
  const [assetRefining, setAssetRefining] = useState<Record<string, boolean>>({});
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

  // Auto-open dashboard customization dialog when pipeline is awaiting config
  useEffect(() => {
    if (bgJob?.status === "awaiting-dashboard-config" && bgJob.researchedSections?.length) {
      setShowDashboardConfig(true);
    }
  }, [bgJob?.status]);

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
    setSelectedAiSuggestion(null);
    setAiSuggestions([]);
    setLoadingSuggestions(true);
    setSwapDialogOpen(true);

    // Fetch existing unselected proposed assets
    const { data } = await supabase
      .from("proposed_assets")
      .select("id, asset_name, brief_description, selected")
      .eq("application_id", applicationId)
      .eq("selected", false)
      .order("created_at", { ascending: true });

    setProposedAlternatives((data as ProposedAsset[]) || []);

    // Fetch AI-suggested alternatives for this job type
    try {
      const allExisting = [
        ...generatedAssets.map(a => a.asset_name),
        ...(data || []).map((p: any) => p.asset_name),
        'Resume', 'Cover Letter', 'Dashboard',
      ];
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          jobTitle,
          jobDescription,
          companyName,
          existingAssets: allExisting,
        }),
      });
      if (resp.ok) {
        const result = await resp.json();
        if (result.suggestions) {
          // Filter out any that overlap with proposed alternatives
          const proposedNames = new Set((data || []).map((p: any) => p.asset_name.toLowerCase()));
          const filtered = result.suggestions.filter((s: AiSuggestion) =>
            !proposedNames.has(s.asset_name.toLowerCase())
          );
          setAiSuggestions(filtered);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch AI suggestions:', e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSwapAsset = async () => {
    if (!swapAssetId) return;
    const currentAsset = generatedAssets.find((a) => a.id === swapAssetId);
    if (!currentAsset) return;

    // Determine swap target — either a proposed asset or an AI suggestion
    const newProposed = selectedSwapId ? proposedAlternatives.find((p) => p.id === selectedSwapId) : null;
    const swapTarget = newProposed
      ? { name: newProposed.asset_name, description: newProposed.brief_description }
      : selectedAiSuggestion
        ? { name: selectedAiSuggestion.asset_name, description: selectedAiSuggestion.brief_description }
        : null;

    if (!swapTarget) return;

    setIsSwapping(true);
    try {
      // 1. Save current asset as revision
      if (currentAsset.html) {
        try {
          await saveGeneratedAssetRevision(applicationId, swapAssetId, currentAsset.html, `Before swap to ${swapTarget.name}`);
        } catch { /* non-critical */ }
      }

      // 2. Mark old proposed_asset as not selected
      await supabase.from("proposed_assets").update({ selected: false })
        .eq("application_id", applicationId)
        .eq("asset_name", currentAsset.asset_name);

      // If swapping to an existing proposed asset, mark it selected
      if (newProposed) {
        await supabase.from("proposed_assets").update({ selected: true })
          .eq("id", selectedSwapId!);
      } else {
        // Create a new proposed_asset record for the AI suggestion
        await supabase.from("proposed_assets").insert({
          application_id: applicationId,
          asset_name: swapTarget.name,
          brief_description: swapTarget.description,
          selected: true,
        });
      }

      // 3. Update generated_assets row with new name/description, set to generating
      await supabase.from("generated_assets").update({
        asset_name: swapTarget.name,
        brief_description: swapTarget.description,
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
          assetName: swapTarget.name,
          assetDescription: swapTarget.description,
          jobDescription,
          companyName,
          jobTitle,
          competitors: app?.competitors,
          products: app?.products,
          customers: app?.customers,
          applicationId,
          variabilityRecommendations: app?.design_variability?.recommendations || [],
          applicationCreatedAt: app?.created_at,
          branding: app?.branding,
           regenerationCount: 0,
           candidateName: candidateName || "",
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
            ? { ...a, asset_name: swapTarget.name, brief_description: swapTarget.description, generation_status: 'generating' }
            : a
        )
      );

      setSwapDialogOpen(false);
      toast({ title: "Asset swapped!", description: `Now generating "${swapTarget.name}".` });
      setAssetRevisionTriggers((prev) => ({ ...prev, [swapAssetId]: (prev[swapAssetId] || 0) + 1 }));
    } catch (e: any) {
      toast({ title: "Swap failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleAssetVibeEdit = async (assetId: string, assetName: string, currentHtml: string) => {
    const input = (assetChatInput[assetId] || '').trim();
    if (!input || assetRefining[assetId]) return;

    setAssetChatInput(prev => ({ ...prev, [assetId]: '' }));
    const history = assetChatHistory[assetId] || [];
    const newHistory = [...history, { role: 'user', content: input }];
    setAssetChatHistory(prev => ({ ...prev, [assetId]: newHistory }));
    setAssetRefining(prev => ({ ...prev, [assetId]: true }));

    try {
      // Save revision before refinement
      try {
        await saveGeneratedAssetRevision(applicationId, assetId, currentHtml, `Before: ${input.slice(0, 50)}`);
        setAssetRevisionTriggers(prev => ({ ...prev, [assetId]: (prev[assetId] || 0) + 1 }));
      } catch { /* non-critical */ }

      let accumulated = '';
      await streamRefineMaterial({
        currentContent: currentHtml,
        contentType: 'html',
        assetName,
        userMessage: input,
        chatHistory: newHistory,
        onDelta: (text) => { accumulated += text; },
        onDone: async () => {
          // Clean up markdown fences if present
          let cleaned = accumulated.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
          const htmlStart = cleaned.indexOf('<!');
          if (htmlStart > 0) cleaned = cleaned.slice(htmlStart);
          const htmlEnd = cleaned.lastIndexOf('</html>');
          if (htmlEnd !== -1) cleaned = cleaned.slice(0, htmlEnd + 7);

          if (cleaned) {
            // Inject one-page guard CSS for vibe-edited content
            const guardedHtml = injectOnePageGuard(cleaned);
            await supabase.from("generated_assets").update({ html: guardedHtml }).eq("id", assetId);
            setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, html: guardedHtml } : a));
            setAssetChatHistory(prev => ({
              ...prev,
              [assetId]: [...(prev[assetId] || []), { role: 'assistant', content: '✅ Changes applied' }],
            }));
          }
        },
      });
    } catch (e: any) {
      setAssetChatHistory(prev => ({
        ...prev,
        [assetId]: [...(prev[assetId] || []), { role: 'assistant', content: `❌ Error: ${e.message}` }],
      }));
      toast({ title: "Refinement failed", description: e.message, variant: "destructive" });
    } finally {
      setAssetRefining(prev => ({ ...prev, [assetId]: false }));
    }
  };

  const guardedDownload = (isOlder: boolean, action: () => void) => {
    if (isOlder) {
      setVersionAlertAction(() => action);
    } else {
      action();
    }
  };

  return (
    <>
      {/* Dashboard Customization Dialog */}
      {bgJob?.status === "awaiting-dashboard-config" && (
        <DashboardCustomizationDialog
          open={showDashboardConfig}
          onOpenChange={setShowDashboardConfig}
          researchedSections={bgJob.researchedSections || []}
          researchedCfoScenarios={bgJob.researchedCfoScenarios || []}
          scrapedBranding={bgJob.scrapedBranding}
          onConfirm={(choices) => {
            setShowDashboardConfig(false);
            backgroundGenerator.resumeDashboardGeneration(applicationId, choices);
          }}
          onSkip={() => {
            setShowDashboardConfig(false);
            backgroundGenerator.resumeDashboardGeneration(applicationId, {
              selectedSections: bgJob.researchedSections?.slice(0, 7),
              selectedCfoScenarios: (bgJob.researchedCfoScenarios || [])
                .sort((a: any, b: any) => (a.relevanceRank || 99) - (b.relevanceRank || 99))
                .slice(0, 3),
            });
          }}
        />
      )}
      <VersionDownloadAlert
        open={!!versionAlertAction}
        onOpenChange={(open) => { if (!open) setVersionAlertAction(null); }}
        onConfirm={() => { versionAlertAction?.(); setVersionAlertAction(null); }}
        versionLabel="an older revision"
      />
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="w-full justify-start flex-wrap">
          {allMaterialTabs.map((tab) => {
            const familyMatch = 'asset' in tab && tab.asset?.html
              ? tab.asset.html.match(/data-style-family="([A-F])"/)
              : null;
            const familyId = familyMatch ? familyMatch[1] : null;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5">
                {tab.label}
                {isAdmin && familyId && (
                  <span className="ml-0.5 inline-flex items-center justify-center rounded bg-muted text-[10px] font-mono leading-none px-1 py-0.5 text-muted-foreground">
                    {familyId}
                  </span>
                )}
                {('asset' in tab && tab.asset?.generation_status === 'generating') && (
                  <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
                )}
              </TabsTrigger>
            );
          })}
          {isBgGenerating && generatedAssets.length === 0 && legacyAssets.length === 0 && (
            <TabsTrigger value="_loading" disabled className="flex items-center gap-1.5 opacity-50">
              <Loader2 className="h-3 w-3 animate-spin text-yellow-500" /> Generating...
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

        {/* Admin-only: Publish Live Dashboard */}
        {isAdmin && dashboardData && (
          <PublishDashboard
            applicationId={applicationId}
            dashboardData={dashboardData}
            companyName={companyName}
            jobTitle={jobTitle}
            toast={toast}
            app={app}
            jobDescription={jobDescription}
          />
        )}

        {/* Dashboard sub-tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)}>
              <Edit3 className="mr-2 h-4 w-4" /> {chatOpen ? "Hide Chat" : "Vibe Edit"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRegenerateDashboard} disabled={isRegenerating}>
              {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Regenerate
            </Button>
            {dashboardHtml && (
              <>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(previewHtml || dashboardHtml); toast({ title: "Copied!", description: "Dashboard HTML copied." }); }}>
                  <Copy className="mr-2 h-4 w-4" /> Copy HTML
                </Button>
                <SaveAsTemplate dashboardHtml={previewHtml || dashboardHtml} applicationId={applicationId} defaultLabel={`${companyName} ${jobTitle} Dashboard`.trim()} defaultJobFunction={jobTitle} defaultDepartment="" />
                {dashboardData ? (
                  <Button variant="outline" size="sm" onClick={() => guardedDownload(!!previewHtml, handleDownloadZip)}><FolderArchive className="mr-2 h-4 w-4" /> Download ZIP</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => guardedDownload(!!previewHtml, () => {
                    downloadHtmlFile(previewHtml || dashboardHtml, buildFileName(candidateProfile?.first_name, candidateProfile?.last_name, "dashboard", companyName, "html"));
                    recordDownloadSignal(applicationId, "dashboard", jobTitle);
                    toast({ title: "Downloaded" });
                  })}><Download className="mr-2 h-4 w-4" /> Download HTML</Button>
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
              <div className="w-full relative" style={{ height: "70vh" }}>
                <iframe ref={iframeRef} srcDoc={previewHtml || dashboardHtml} className="w-full h-full border-0" sandbox="allow-scripts" title="Dashboard Preview" />
                {showDashboardWelcome && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-pointer" onClick={() => { setShowDashboardWelcome(false); localStorage.setItem("dashboard-welcome-dismissed", "1"); }}>
                    <div className="bg-background border border-primary/30 rounded-xl shadow-2xl p-8 max-w-md text-center space-y-4 animate-in fade-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                      {app?.company_icon_url ? (
                        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          <img src={app.company_icon_url} alt={companyName || "Company"} className="w-10 h-10 object-contain" />
                        </div>
                      ) : (
                        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-7 w-7 text-primary" />
                        </div>
                      )}
                      <h3 className="text-xl font-semibold tracking-tight">
                        {companyName ? `Your ${companyName} dashboard is interactive!` : "Your dashboard is interactive!"}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Click on charts to drill down, use global filters to slice data across sections, toggle sidebar pages, hover for tooltips, and use the scenario sliders to explore different projections.
                      </p>
                      <Button onClick={() => { setShowDashboardWelcome(false); localStorage.setItem("dashboard-welcome-dismissed", "1"); }} className="w-full">
                        Got it — let me explore!
                      </Button>
                    </div>
                  </div>
                )}
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
              {asset.html && asset.generation_status === 'complete' && (!asset.downloaded_at || isAdmin) && (
                <>
                  <Button variant="outline" size="sm" onClick={async () => {
                    if (!jobDescription.trim()) return;
                    toast({ title: `Regenerating ${asset.asset_name}...` });
                    try {
                      // Save revision before regeneration
                      try {
                        await saveGeneratedAssetRevision(applicationId, asset.id, asset.html, "Before regeneration");
                      } catch { /* non-critical */ }

                      // Count existing revisions to pass regenerationCount
                      let regenCount = 0;
                      try {
                        const { data: revisions } = await supabase
                          .from("generated_asset_revisions")
                          .select("id")
                          .eq("asset_id", asset.id);
                        regenCount = revisions?.length || 0;
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
                          applicationCreatedAt: app?.created_at,
                          branding: app?.branding,
                           regenerationCount: regenCount,
                           candidateName: candidateName || "",
                        }),
                      });
                      if (resp.ok) {
                        const data = await resp.json();
                        if (data.html) {
                          const qaLabel = data.review?.auditPassed && data.review?.uiPassed
                            ? `Regenerated (audit-clean, cycle ${data.review.reviewCycles})`
                            : data.review?.auditPassed
                            ? `Regenerated (audit-clean, review best-effort)`
                            : `Regenerated (best-effort, ${data.review?.violations?.length || 0} issues)`;
                          await supabase.from("generated_assets").update({ html: data.html }).eq("id", asset.id);
                          setGeneratedAssets(prev => prev.map(a => a.id === asset.id ? { ...a, html: data.html } : a));
                          try { await saveGeneratedAssetRevision(applicationId, asset.id, data.html, qaLabel); } catch { /* non-critical */ }
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
                  <Button variant="outline" size="sm" onClick={() => setAssetChatOpen(prev => ({ ...prev, [asset.id]: !prev[asset.id] }))}>
                    <Edit3 className="mr-2 h-4 w-4" /> {assetChatOpen[asset.id] ? "Hide Chat" : "Vibe Edit"}
                  </Button>
                </>
              )}
              {asset.downloaded_at && !isAdmin && (
                <Badge variant="secondary" className="text-xs">🔒 Downloaded — locked</Badge>
              )}
              {asset.html && (
                <Button variant="outline" size="sm" onClick={() => {
                  const viewedHtml = assetPreviewHtml[asset.id] || asset.html;
                  const isOlder = !!assetPreviewHtml[asset.id];
                  guardedDownload(isOlder, async () => {
                    const pdfName = buildFileName(candidateProfile?.first_name, candidateProfile?.last_name, asset.asset_name, companyName, "pdf");
                    downloadMaterialPdf(viewedHtml, pdfName);
                    recordDownloadSignal(applicationId, asset.asset_name, jobTitle);
                    await supabase.from("generated_assets").update({ downloaded_at: new Date().toISOString() }).eq("id", asset.id);
                    setGeneratedAssets(prev => prev.map(a => a.id === asset.id ? { ...a, downloaded_at: new Date().toISOString() } : a));
                    toast({ title: "Printing PDF" });
                  });
                }}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
              )}
            </div>

            {/* Vibe Edit Chat */}
            {assetChatOpen[asset.id] && asset.html && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {(assetChatHistory[asset.id] || []).map((msg, i) => (
                      <div key={i} className={`text-sm p-2 rounded ${msg.role === "user" ? "bg-primary/10 text-right" : "bg-muted"}`}>{msg.content}</div>
                    ))}
                    {assetRefining[asset.id] && <div className="text-sm p-2 rounded bg-muted flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Refining...</div>}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={`e.g. "Make the headers more prominent" or "Add a summary section"`}
                      value={assetChatInput[asset.id] || ''}
                      onChange={(e) => setAssetChatInput(prev => ({ ...prev, [asset.id]: e.target.value }))}
                      rows={2}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAssetVibeEdit(asset.id, asset.asset_name, asset.html); } }}
                    />
                    <Button
                      onClick={() => handleAssetVibeEdit(asset.id, asset.asset_name, asset.html)}
                      disabled={!(assetChatInput[asset.id] || '').trim() || assetRefining[asset.id]}
                      className="self-end"
                    >
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

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
              <FitPagePreview html={assetPreviewHtml[asset.id] || asset.html} title={asset.asset_name} />
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
                  downloadMaterialPdf(legacy.html, buildFileName(candidateProfile?.first_name, candidateProfile?.last_name, legacy.name, companyName, "pdf"));
                  recordDownloadSignal(applicationId, legacy.name, jobTitle);
                  toast({ title: "Printing PDF" });
                }}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
              </div>
              <FitPagePreview html={legacy.html} title={legacy.name} />
            </TabsContent>
          ))}
      </Tabs>

      {/* Change Asset Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Change Asset</DialogTitle>
            <DialogDescription>
              Replace "{swapAssetName}" with a different material. The total number of materials stays the same.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 py-2">
            {/* Previously proposed alternatives */}
            {proposedAlternatives.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Previously Proposed</p>
                <div className="space-y-2">
                  {proposedAlternatives.map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => { setSelectedSwapId(alt.id); setSelectedAiSuggestion(null); }}
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
              </div>
            )}

            {/* AI-suggested alternatives */}
            {loadingSuggestions && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding materials relevant to this role…
              </div>
            )}
            {!loadingSuggestions && aiSuggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  <Sparkles className="inline h-3 w-3 mr-1" />
                  Suggested for this Role
                </p>
                <div className="space-y-2">
                  {aiSuggestions.map((sug, idx) => (
                    <div
                      key={`ai-${idx}`}
                      onClick={() => { setSelectedAiSuggestion(sug); setSelectedSwapId(null); }}
                      className={`p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedAiSuggestion?.asset_name === sug.asset_name
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <p className="font-medium text-sm">{sug.asset_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{sug.brief_description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loadingSuggestions && proposedAlternatives.length === 0 && aiSuggestions.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                No alternative materials available for this application.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSwapAsset}
              disabled={(!selectedSwapId && !selectedAiSuggestion) || isSwapping}
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
