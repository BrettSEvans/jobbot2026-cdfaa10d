import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, Images } from "lucide-react";
import AssetReviewCarousel from "@/components/admin/AssetReviewCarousel";
import { format } from "date-fns";

interface UserWithStats {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  application_count: number;
}

function useUserList() {
  return useQuery({
    queryKey: ["admin_user_list"],
    staleTime: 15_000,
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, created_at, last_sign_in_at")
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: counts, error: countErr } = await supabase
        .from("job_applications")
        .select("user_id")
        .is("deleted_at", null);
      if (countErr) throw countErr;

      const countMap: Record<string, number> = {};
      (counts ?? []).forEach((row) => {
        if (row.user_id) countMap[row.user_id] = (countMap[row.user_id] || 0) + 1;
      });

      return (profiles ?? []).map((p) => ({
        ...p,
        application_count: countMap[p.id] || 0,
      })) as UserWithStats[];
    },
  });
}

function UserList() {
  const { data: users, isLoading } = useUserList();

  if (isLoading)
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );

  if (!users?.length)
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No users found.</p>
        </CardContent>
      </Card>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">User</th>
            <th className="py-2 pr-4 font-medium">Signed Up</th>
            <th className="py-2 pr-4 font-medium text-center">Applications</th>
            <th className="py-2 font-medium">Last Login</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border/50 last:border-0">
              <td className="py-3 pr-4">
                <div className="font-medium text-foreground truncate max-w-[200px]">
                  {u.display_name || u.email || "Unknown"}
                </div>
                {u.display_name && u.email && (
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">{u.email}</div>
                )}
              </td>
              <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                {format(new Date(u.created_at), "MMM d, yyyy")}
              </td>
              <td className="py-3 pr-4 text-center">
                <Badge variant={u.application_count > 0 ? "default" : "secondary"} className="text-xs">
                  {u.application_count}
                </Badge>
              </td>
              <td className="py-3 text-muted-foreground whitespace-nowrap">
                {u.last_sign_in_at
                  ? format(new Date(u.last_sign_in_at), "MMM d, yyyy h:mm a")
                  : "Never"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();

  // Single admin role check using shared user
  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["user_role_admin", user?.id],
    enabled: !!user && !loading,
    staleTime: 60_000,
    retry: 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });

  if (loading || (user && (roleLoading || typeof isAdmin === "undefined"))) {
    return <div className="flex items-center justify-center h-[60vh]"><Skeleton className="w-48 h-8" /></div>;
  }

  if (!user || isAdmin === false) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-heading font-bold text-foreground">Admin Panel</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Users
          </TabsTrigger>
          <TabsTrigger value="asset-review" className="gap-1.5">
            <Images className="h-3.5 w-3.5" /> Asset Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Users</CardTitle>
              <CardDescription>Registered users with activity stats</CardDescription>
            </CardHeader>
            <CardContent>
              <UserList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="asset-review">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Asset Quality Review</CardTitle>
              <CardDescription>Rate generated materials to train quality benchmarks</CardDescription>
            </CardHeader>
            <CardContent>
              <AssetReviewCarousel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
