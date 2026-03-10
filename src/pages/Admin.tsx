import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { ArrowLeft, Loader2, Shield, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Extracted tab components
import ApprovalQueue from "@/components/ApprovalQueue";
import AdminPromptsTab from "@/components/admin/AdminPromptsTab";
import AdminGenerationGuideTab from "@/components/admin/AdminGenerationGuideTab";
import AdminRolesTab from "@/components/admin/AdminRolesTab";
import AdminRateLimitsTab from "@/components/admin/AdminRateLimitsTab";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import AdminSubscriptionsTab from "@/components/admin/AdminSubscriptionsTab";
import AdminQATab from "@/components/admin/AdminQATab";
import AdminGuideTab from "@/components/admin/AdminGuideTab";
import AdminPromptLogTab from "@/components/admin/AdminPromptLogTab";
import AdminCampaignsTab from "@/components/admin/AdminCampaignsTab";
import AdminSidebar, { getVisibleSections } from "@/components/admin/AdminSidebar";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isQA, isMarketing, hasAnyRole, loading: roleLoading } = useUserRoles();
  const [activeBuildLabel, setActiveBuildLabel] = useState<string | null>(null);

  // Determine default section based on role
  const visible = getVisibleSections(isAdmin, isQA, isMarketing);
  const defaultSection = visible[0]?.id || "qa";
  const [activeSection, setActiveSection] = useState(defaultSection);

  // Update activeSection when roles load
  useEffect(() => {
    if (!roleLoading && visible.length > 0 && !visible.find(s => s.id === activeSection)) {
      setActiveSection(visible[0].id);
    }
  }, [roleLoading, isAdmin, isQA]);

  useEffect(() => {
    supabase
      .from("qa_test_runs")
      .select("build_label")
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setActiveBuildLabel(data.build_label);
      });
  }, []);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAnyRole) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">You don't have access to this panel.</p>
        <Button variant="outline" onClick={() => navigate("/profile")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
        </Button>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "approvals": return <ApprovalQueue />;
      case "subscriptions": return <AdminSubscriptionsTab />;
      case "prompts": return <AdminPromptsTab />;
      case "gen-guide": return <AdminGenerationGuideTab />;
      case "roles": return <AdminRolesTab />;
      case "limits": return <AdminRateLimitsTab />;
      case "audit": return <AdminAuditTab />;
      case "prompt-log": return <AdminPromptLogTab />;
      case "qa": return <AdminQATab />;
      case "guide":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> User Guide & Roadmap
              </CardTitle>
              <CardDescription>Admin panel documentation and enhancement roadmap.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminGuideTab />
            </CardContent>
          </Card>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight font-heading">Admin Panel</h1>
              {activeBuildLabel && (
                <Badge variant="outline" className="text-xs font-mono">
                  Build: {activeBuildLabel}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isAdmin && isQA ? "Full admin & QA access" : isAdmin ? "Administrator access" : "QA tester access"}
            </p>
          </div>
        </div>

        {/* Sidebar + Content */}
        <div className="flex gap-6">
          <AdminSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            isAdmin={isAdmin}
            isQA={isQA}
          />
          <div className="flex-1 min-w-0">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
