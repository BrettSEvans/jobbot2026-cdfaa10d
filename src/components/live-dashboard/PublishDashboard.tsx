import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Copy, Loader2, Check, RefreshCw, Edit3, Send, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DashboardData } from "@/lib/dashboard/schema";
import { streamDashboardGeneration, streamDashboardRefinement } from "@/lib/api/jobApplication";
import { parseLlmJsonOutput, assembleDashboardHtml } from "@/lib/dashboard/assembler";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

interface PublishDashboardProps {
  applicationId: string;
  dashboardData: DashboardData | null;
  companyName: string;
  jobTitle: string;
  toast: any;
  /** Optional: full app record for regeneration context */
  app?: any;
  jobDescription?: string;
}

export default function PublishDashboard({
  applicationId, dashboardData, companyName, jobTitle, toast, app, jobDescription,
}: PublishDashboardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [vibeOpen, setVibeOpen] = useState(false);
  const [vibeInput, setVibeInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);

  // Check admin role
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

  // Fetch existing live dashboard
  const { data: liveDash, isLoading } = useQuery({
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

  // Publish / update mutation
  const publishMutation = useMutation({
    mutationFn: async (overrideData?: DashboardData) => {
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

      if (liveDash) {
        const { error } = await supabase
          .from("live_dashboards")
          .update(payload)
          .eq("id", liveDash.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("live_dashboards")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-dashboard-admin", applicationId] });
      toast({ title: "Dashboard published!", description: "Your live dashboard is now available." });
    },
    onError: (err: any) => {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    },
  });

  // Toggle published
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
    },
  });

  // Toggle chatbot
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
    },
  });

  // Regenerate live dashboard
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

      // Update live dashboard with new data
      await publishMutation.mutateAsync(parsed);
      setChatHistory([]);
      toast({ title: "Dashboard regenerated!", description: "The live dashboard has been updated with fresh data." });
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  }, [liveDash, jobDescription, app, companyName, jobTitle, publishMutation, toast]);

  // Vibe edit: refine live dashboard JSON
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
        // Update live dashboard with refined data
        const { error } = await supabase
          .from("live_dashboards")
          .update({
            dashboard_data: parsed as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", liveDash.id);
        if (error) throw error;

        setChatHistory((prev) => [...prev, { role: "assistant", content: "✅ Dashboard updated!" }]);
        queryClient.invalidateQueries({ queryKey: ["live-dashboard-admin", applicationId] });
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Live Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!liveDash ? (
          <Button
            onClick={() => publishMutation.mutate(undefined)}
            disabled={publishMutation.isPending}
            size="sm"
          >
            {publishMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Publish Live Dashboard
          </Button>
        ) : (
          <>
            {/* URL */}
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

            {/* Toggles */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Published</span>
              <div className="flex items-center gap-2">
                <Badge variant={liveDash.is_published ? "default" : "secondary"} className="text-xs">
                  {liveDash.is_published ? "Live" : "Draft"}
                </Badge>
                <Switch
                  checked={liveDash.is_published}
                  onCheckedChange={(v) => toggleMutation.mutate(v)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">AI Chatbot</span>
              <Switch
                checked={liveDash.chatbot_enabled}
                onCheckedChange={(v) => chatbotMutation.mutate(v)}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => publishMutation.mutate(undefined)}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Sync from App
              </Button>

              <Button
                variant="outline" size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating || !jobDescription}
              >
                {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Regenerate
              </Button>

              <Button
                variant="outline" size="sm"
                onClick={() => setVibeOpen(!vibeOpen)}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1" />
                {vibeOpen ? "Hide Edit" : "Vibe Edit"}
              </Button>
            </div>

            {/* Vibe Edit Panel */}
            {vibeOpen && (
              <div className="space-y-2 pt-1">
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

                {/* Chat history */}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
