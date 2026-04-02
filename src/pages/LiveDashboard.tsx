import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import DashboardRenderer from "@/components/live-dashboard/DashboardRenderer";
import DashboardChatbot from "@/components/live-dashboard/DashboardChatbot";
import type { DashboardData } from "@/lib/dashboard/schema";

export default function LiveDashboard() {
  const { username, company, jobtitle } = useParams<{
    username: string; company: string; jobtitle: string;
  }>();

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ["live-dashboard", username, company, jobtitle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_dashboards")
        .select("*")
        .eq("slug_username", username!)
        .eq("slug_company", company!)
        .eq("slug_jobtitle", jobtitle!)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!username && !!company && !!jobtitle,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Dashboard Not Found</h1>
          <p className="text-muted-foreground">This dashboard doesn't exist or hasn't been published.</p>
        </div>
      </div>
    );
  }

  const dashData = dashboard.dashboard_data as unknown as DashboardData;

  return (
    <>
      <DashboardRenderer data={dashData} />
      {dashboard.chatbot_enabled && (
        <DashboardChatbot
          dashboardId={dashboard.id}
          companyName={dashData.meta?.companyName || ""}
          jobTitle={dashData.meta?.jobTitle || ""}
        />
      )}
    </>
  );
}
