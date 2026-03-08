import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Trash2, Shield, FlaskConical } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PROTECTED_ADMIN_ID = "f8182de6-de8e-4c12-9009-88fb5c4e66b8";

interface RoleEntry {
  id: string;
  user_id: string;
  role: string;
}

interface UserWithRoles {
  user_id: string;
  email: string | null;
  display_name: string | null;
  roles: RoleEntry[];
}

export default function AdminRolesTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "qa">("qa");
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; role: string; email: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get all role entries
      const { data: roleData, error: roleErr } = await (supabase as any)
        .from("user_roles")
        .select("id, user_id, role");
      if (roleErr) throw new Error(roleErr.message);

      // Get profiles for these users
      const userIds = [...new Set((roleData || []).map((r: RoleEntry) => r.user_id))];
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds);

      const profileMap = new Map<string, { email: string | null; display_name: string | null }>();
      (profiles || []).forEach((p: any) => profileMap.set(p.id, { email: p.email, display_name: p.display_name }));

      // Group by user
      const userMap = new Map<string, UserWithRoles>();
      for (const r of roleData || []) {
        if (!userMap.has(r.user_id)) {
          const profile = profileMap.get(r.user_id);
          userMap.set(r.user_id, {
            user_id: r.user_id,
            email: profile?.email || null,
            display_name: profile?.display_name || null,
            roles: [],
          });
        }
        userMap.get(r.user_id)!.roles.push(r);
      }

      setUsers([...userMap.values()]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!addEmail.trim()) return;
    setAdding(true);
    try {
      // Look up user by email in profiles
      const { data: profile, error: profileErr } = await (supabase as any)
        .from("profiles")
        .select("id, email")
        .ilike("email", addEmail.trim())
        .maybeSingle();

      if (profileErr) throw new Error(profileErr.message);
      if (!profile) {
        toast({ title: "User not found", description: "No user with that email address.", variant: "destructive" });
        setAdding(false);
        return;
      }

      const { error } = await (supabase as any)
        .from("user_roles")
        .insert({ user_id: profile.id, role: addRole });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already assigned", description: `User already has the ${addRole} role.`, variant: "destructive" });
        } else {
          throw new Error(error.message);
        }
      } else {
        toast({ title: "Role added", description: `${addRole} role granted to ${profile.email}.` });
        setAddEmail("");
        loadData();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      const { error } = await (supabase as any)
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw new Error(error.message);
      toast({ title: "Role removed" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filteredUsers = searchEmail.trim()
    ? users.filter(u =>
        (u.email || "").toLowerCase().includes(searchEmail.toLowerCase()) ||
        u.user_id.includes(searchEmail)
      )
    : users;

  const roleIcon = (role: string) => {
    if (role === "admin") return <Shield className="h-3 w-3" />;
    if (role === "qa") return <FlaskConical className="h-3 w-3" />;
    return null;
  };

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "default" as const;
    if (role === "qa") return "secondary" as const;
    return "outline" as const;
  };

  if (loading) {
    return <Card><CardContent className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles & Access</CardTitle>
          <CardDescription>Manage who can access the admin panel and QA testing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or user ID…"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User list */}
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{u.email || "No email"}</span>
                    {u.user_id === currentUserId && <Badge variant="outline" className="text-xs">You</Badge>}
                    {u.user_id === PROTECTED_ADMIN_ID && <Badge className="text-xs">Founder</Badge>}
                  </div>
                  {u.display_name && <p className="text-xs text-muted-foreground">{u.display_name}</p>}
                  <p className="text-xs text-muted-foreground font-mono">{u.user_id}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {u.roles.map((r) => (
                    <Badge key={r.id} variant={roleBadgeVariant(r.role)} className="text-xs gap-1">
                      {roleIcon(r.role)} {r.role}
                      {u.user_id !== PROTECTED_ADMIN_ID && u.user_id !== currentUserId && (
                        <button
                          onClick={() => setRemoveTarget({ userId: u.user_id, role: r.role, email: u.email })}
                          className="ml-1 hover:text-destructive"
                          aria-label={`Remove ${r.role} role`}
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No users with roles found.</p>
            )}
          </div>

          {/* Add role */}
          <div className="flex gap-2 items-end pt-2 border-t border-border">
            <div className="flex-1">
              <Input
                placeholder="User email address"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as "admin" | "qa")}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="qa">QA</option>
              <option value="admin">Admin</option>
            </select>
            <Button size="sm" onClick={handleAddRole} disabled={!addEmail.trim() || adding}>
              {adding ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the <strong>{removeTarget?.role}</strong> role from <strong>{removeTarget?.email || removeTarget?.userId}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (removeTarget) handleRemoveRole(removeTarget.userId, removeTarget.role);
              setRemoveTarget(null);
            }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
