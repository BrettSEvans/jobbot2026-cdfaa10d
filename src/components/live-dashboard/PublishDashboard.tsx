import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Copy, Loader2, Check, RefreshCw, Edit3, Send, Info, Eye, EyeOff, MessageSquare, MessageSquareOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DashboardData } from "@/lib/dashboard/schema";
import { streamDashboardGeneration, streamDashboardRefinement } from "@/lib/api/jobApplication";
import { parseLlmJsonOutput, assembleDashboardHtml } from "@/lib/dashboard/assembler";
import { saveLiveDashboardRevision } from "@/lib/api/liveDashboardRevisions";
import LiveDashboardRevisions from "./LiveDashboardRevisions";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

interface PublishDashboardProps {
  applicationId: string;
  dashboardData: DashboardData | null;
  companyName: string;
  jobTitle: string;
  toast: any;
  app?: any;
  jobDescription?: string;
  onPreviewLiveData?: (data: DashboardData | null) => void;
}

export default function PublishDashboard({
  applicationId, dashboardData, companyName, jobTitle, toast, app, jobDescription, onPreviewLiveData,
}: PublishDashboardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [vibeOpen, setVibeOpen] = useState(false);
  const [vibeInput, setVibeInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const { data: liveDash } = useQuery({
    queryKey: ["live-dashboard-admin", applicationId],
    enabled: !!isAdmin && !!applicationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("live_dashboards")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle();
      return data;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ data: overrideData, source: src }: { data?: DashboardData; source?: string } = {}) => {
      const dataToPublish = overrideData || dashboardData;
      if (!dataToPublish || !user) throw new Error("Missing data");

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("id", user.id)
        .single();

      const displayName = profile?.display_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "user";
      const slugUsername = slugify(displayName);
      const slugCompany = slugify(companyName || "company");
      const slugJobtitle = slugify(jobTitle || "role");

      const payload = {
        application_id: applicationId,
        user_id: user.id,
        slug_username: slugUsername,
        slug_company: slugCompany,
        slug_jobtitle: slugJobtitle,
        dashboard_data: dataToPublish as any,
        is_published: true,
        chatbot_enabled: true,
        updated_at: new Date().toISOString(),
      };

      let dashId = liveDash?.id;
      if (liveDash) {
        const { error } = await supabase
          .from("live_dashboards")
          .update(payload)
          .eq("id", liveDash.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("live_dashboards")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        dashId = inserted.id;
      }

      // Save revision
      if (dashId) {
        try {
          await saveLiveDashboardRevision(dashId, applicationId, dataToPublish, src || "publish", src === "regenerate" ? "Regenerated" : "Published");
        } catch { /* non-critical */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-dashboard-admin", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["live-dashboard-view", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["live-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["live-dashboard-revisions"] });
      toast({ title: "Dashboard published!", description: "Your live dashboard is now available." });
    },
    onError: (err: any) => {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (published: boolean) => {
      if (!liveDash) return;
      const { error } = await supabase
        .from("live_dashboards")
        .update({ is_published: published, updated_at: new Date().toISOString() })
        .eq("id", liveDash.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-dashboard-admin", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["live-dashboard-view", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["live-dashboard"] });
    },
  });

  const chatbotMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!liveDash) return;
      const { error } = await supabase
        .from("live_dashboards")
        .update({ chatbot_enabled: enabled, updated_at: new Date().toISOString() })
        .eq("id", liveDash.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-dashboard-admin", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["live-dashboard-view", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["live-dashboard"] });
    },
  });

  const handleRegenerate = useCallback(async () => {
    if (!liveDash || !jobDescription?.trim()) {
      toast({ title: "Cannot regenerate", description: "Job description is required.", variant: "destructive" });
      return;
    }
    setIsRegenerating(true);
    try {
      let accumulated = "";
      await streamDashboardGeneration({
        jobDescription,
        branding: app?.branding,
        companyName,
        jobTitle,
        competitors: (app?.competitors as unknown as string[]) || [],
        customers: (app?.customers as unknown as string[]) || [],
        products: (app?.products as unknown as string[]) || [],
        onDelta: (text) => { accumulated += text; },
        onDone: () => {},
      });

      const parsed = parseLlmJsonOutput(accumulated);
      if (!parsed) {
        toast({ title: "Regeneration failed", description: "AI response could not be parsed. Try again.", variant: "destructive" });
        return;
      }

      await publishMutation.mutateAsync({ data: parsed, source: "regenerate" });
      setChatHistory([]);
      toast({ title: "Dashboard regenerated!", description: "The live dashboard has been updated with fresh data." });
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  }, [liveDash, jobDescription, app, companyName, jobTitle, publishMutation, toast]);

  const handleVibeEdit = useCallback(async () => {
    if (!vibeInput.trim() || isRefining || !liveDash) return;
    const msg = vibeInput.trim();
    setVibeInput("");
    setIsRefining(true);

    const currentData = liveDash.dashboard_data as unknown as DashboardData;
    const currentHtml = assembleDashboardHtml(currentData);
    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);

    try {
      let accumulated = "";
      await streamDashboardRefinement({
        currentHtml,
        currentDashboardData: currentData,
        userMessage: msg,
        chatHistory: newHistory,
        onDelta: (text) => { accumulated += text; },
        onDone: () => {},
      });

      const parsed = parseLlmJsonOutput(accumulated);
      if (parsed) {
        const { error } = await supabase
          .from("live_dashboards")
          .update({
            dashboard_data: parsed as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", liveDash.id);
        if (error) throw error;

        // Save revision
        try {
          await saveLiveDashboardRevision(liveDash.id, applicationId, parsed, "vibe-edit", msg.slice(0, 60));
        } catch { /* non-critical */ }

        setChatHistory((prev) => [...prev, { role: "assistant", content: "✅ Dashboard updated!" }]);
        queryClient.invalidateQueries({ queryKey: ["live-dashboard-admin", applicationId] });
        queryClient.invalidateQueries({ queryKey: ["live-dashboard-revisions"] });
        toast({ title: "Dashboard updated", description: "Your vibe edit has been applied." });
      } else {
        setChatHistory((prev) => [...prev, { role: "assistant", content: "❌ Could not parse the refined output. Try a simpler edit." }]);
        toast({ title: "Edit failed", description: "AI response could not be parsed.", variant: "destructive" });
      }
    } catch (err: any) {
      setChatHistory((prev) => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
      toast({ title: "Edit failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRefining(false);
    }
  }, [vibeInput, isRefining, liveDash, chatHistory, applicationId, queryClient, toast]);

  if (!isAdmin) return null;
  if (!dashboardData) return null;

  const publicUrl = liveDash
    ? `${window.location.origin}/d/${liveDash.slug_username}/${liveDash.slug_company}/${liveDash.slug_jobtitle}`
    : null;

  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPublished = liveDash?.is_published;
  const isChatbotOn = liveDash?.chatbot_enabled;

  return (
    <div className="space-y-3">
      {/* Primary action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {!liveDash ? (
          <Button
            onClick={() => publishMutation.mutate({})}
            disabled={publishMutation.isPending}
            size="sm"
            className="gap-1.5"
          >
            {publishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
            Publish Live Dashboard
          </Button>
        ) : (
          <>
            {/* Publish / Unpublish toggle button */}
            <Button
              variant={isPublished ? "outline" : "default"}
              size="sm"
              className="gap-1.5"
              onClick={() => toggleMutation.mutate(!isPublished)}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isPublished ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {isPublished ? "Unpublish" : "Publish"}
            </Button>

            {/* Status badge */}
            <Badge variant={isPublished ? "default" : "secondary"} className="text-xs">
              {isPublished ? "Live" : "Draft"}
            </Badge>

            {/* Chatbot toggle button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => chatbotMutation.mutate(!isChatbotOn)}
              disabled={chatbotMutation.isPending}
            >
              {chatbotMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isChatbotOn ? (
                <MessageSquareOff className="h-3.5 w-3.5" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
              {isChatbotOn ? "Disable Chat" : "Enable Chat"}
            </Button>

            {/* Regenerate */}
            <Button
              variant="outline" size="sm"
              className="gap-1.5"
              onClick={handleRegenerate}
              disabled={isRegenerating || !jobDescription}
            >
              {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerate
            </Button>

            {/* Vibe Edit toggle */}
            <Button
              variant={vibeOpen ? "secondary" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setVibeOpen(!vibeOpen)}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Vibe Edit
            </Button>
          </>
        )}
      </div>

      {/* Public URL bar */}
      {publicUrl && (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-secondary px-2 py-1 rounded flex-1 truncate">
            {publicUrl}
          </code>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyUrl}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}

      {/* Vibe Edit Panel */}
      {vibeOpen && liveDash && (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Vibe Edit</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Info className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 text-xs space-y-2" side="top">
                <p className="font-semibold">Prompting Guide</p>
                <p><strong>Role:</strong> "As a hiring manager…"</p>
                <p><strong>Outcome:</strong> "Add a section showing…"</p>
                <p><strong>Design:</strong> "Use a heatmap for…"</p>
                <div className="border-t pt-2 space-y-1">
                  <p className="text-muted-foreground">Examples:</p>
                  <p className="italic">"Replace the pipeline chart with a funnel showing conversion rates"</p>
                  <p className="italic">"Add a candidate hero section with my name and tagline"</p>
                  <p className="italic">"Change the color scheme to match Plaid's navy blue"</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {chatHistory.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1.5 text-xs rounded border p-2 bg-secondary/30">
              {chatHistory.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                  <span className={`inline-block px-2 py-1 rounded ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}>
                    {m.content}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              value={vibeInput}
              onChange={(e) => setVibeInput(e.target.value)}
              placeholder="Describe what to change on the live dashboard..."
              className="min-h-[36px] max-h-[72px] resize-none text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleVibeEdit();
                }
              }}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleVibeEdit}
              disabled={isRefining || !vibeInput.trim()}
            >
              {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Version History */}
      {liveDash && (
        <LiveDashboardRevisions
          liveDashboardId={liveDash.id}
          applicationId={applicationId}
          currentData={liveDash.dashboard_data as unknown as DashboardData}
          onPreview={(data) => onPreviewLiveData?.(data)}
          onClearPreview={() => onPreviewLiveData?.(null)}
          toast={toast}
        />
      )}
    </div>
  );
}
