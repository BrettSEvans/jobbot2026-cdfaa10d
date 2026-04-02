import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Copy, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DashboardData } from "@/lib/dashboard/schema";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

interface PublishDashboardProps {
  applicationId: string;
  dashboardData: DashboardData | null;
  companyName: string;
  jobTitle: string;
  toast: any;
}

export default function PublishDashboard({
  applicationId, dashboardData, companyName, jobTitle, toast,
}: PublishDashboardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

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
    mutationFn: async () => {
      if (!dashboardData || !user) throw new Error("Missing data");

      // Get user profile for slug
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
        dashboard_data: dashboardData as any,
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
            onClick={() => publishMutation.mutate()}
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

            {/* Update button */}
            <Button
              variant="outline" size="sm"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Update Dashboard Data
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
