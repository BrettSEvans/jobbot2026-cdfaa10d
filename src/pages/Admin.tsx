import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Users, Shield } from "lucide-react";
import { format } from "date-fns";

function useAdminRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_role", user?.id],
    enabled: !!user,
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
}

function useApprovalQueue() {
  return useQuery({
    queryKey: ["admin_approval_queue"],
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, created_at, approval_status, referral_source")
        .in("approval_status", ["pending", "approved", "rejected"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function ApprovalQueue() {
  const { data: profiles, isLoading } = useApprovalQueue();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const updateApproval = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(`User ${vars.status === "approved" ? "approved" : "rejected"} successfully`);
      qc.invalidateQueries({ queryKey: ["admin_approval_queue"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  const filtered = filter === "pending"
    ? (profiles ?? []).filter((p) => p.approval_status === "pending")
    : (profiles ?? []);

  const pendingCount = (profiles ?? []).filter((p) => p.approval_status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>
          Pending ({pendingCount})
        </Button>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          All Users
        </Button>
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No pending approvals!</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((profile) => {
          const referral = profile.referral_source as Record<string, string> | null;
          return (
            <Card key={profile.id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">
                      {profile.display_name || profile.email || "Unknown"}
                    </span>
                    <Badge
                      variant={
                        profile.approval_status === "approved" ? "default" :
                        profile.approval_status === "rejected" ? "destructive" : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {profile.approval_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {profile.email && <span>{profile.email}</span>}
                    <span>Signed up {format(new Date(profile.created_at), "MMM d, yyyy")}</span>
                    {referral?.utm_campaign && (
                      <Badge variant="outline" className="text-[10px]">
                        Campaign: {referral.utm_campaign}
                      </Badge>
                    )}
                  </div>
                </div>
                {profile.approval_status === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => updateApproval.mutate({ id: profile.id, status: "approved" })}
                      disabled={updateApproval.isPending}
                      className="gap-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateApproval.mutate({ id: profile.id, status: "rejected" })}
                      disabled={updateApproval.isPending}
                      className="gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Admin() {
  const { data: isAdmin, isLoading } = useAdminRole();

  if (isLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><Skeleton className="w-48 h-8" /></div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-heading font-bold text-foreground">Admin Panel</h1>
      </div>

      <Tabs defaultValue="approvals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approvals" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Approval Queue</CardTitle>
              <CardDescription>Review and approve new user registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <ApprovalQueue />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
