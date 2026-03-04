import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Edit3, Plus, Trash2, Loader2, Shield, FileText, Users, BookOpen, ScrollText, RefreshCw, RotateCcw, ChevronDown, Gauge,
} from "lucide-react";
import {
  getAllResumeStyles, createResumeStyle, updateResumeStyle, deleteResumeStyle,
  restoreResumeStyle, hardDeleteResumeStyle,
  getAdminUsers, addAdminRole, removeAdminRole, getAuditLog,
  type ResumePromptStyle, type AuditLogEntry,
} from "@/lib/api/adminPrompts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Protected founder admin — cannot be removed via UI
const PROTECTED_ADMIN_ID = "f8182de6-de8e-4c12-9009-88fb5c4e66b8";

// ---------- Guide Content (from docs/ADMIN_GUIDE.md) ----------

function AdminGuideTab() {
  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 pr-4">

        <h2>Part I — Current Admin Features</h2>

        <h3>1. Accessing the Admin Panel</h3>
        <ol>
          <li>Log in to JobBot with your admin account.</li>
          <li>Navigate to <strong>Profile</strong> (top-right avatar → Profile).</li>
          <li>Click <strong>"Admin Settings"</strong> (only visible to users with the <code>admin</code> role).</li>
          <li>You'll land on <code>/admin</code>.</li>
        </ol>
        <p><strong>If you don't see the button:</strong> Your account doesn't have the admin role. Another admin must grant it.</p>

        <h3>2. Resume Prompt Styles Management</h3>
        <p>Controls the AI system prompts used to generate tailored resumes.</p>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Action</th><th>How</th></tr></thead>
            <tbody>
              <tr><td><strong>View all styles</strong></td><td>Listed in the "Prompts" tab, including inactive ones</td></tr>
              <tr><td><strong>Create a new style</strong></td><td>Click "+ Add New Style" → fill in fields → Save</td></tr>
              <tr><td><strong>Edit a style</strong></td><td>Click the ✏️ icon → modify fields → Save</td></tr>
              <tr><td><strong>Delete a style</strong></td><td>Click 🗑️. <strong>⚠️ Permanent — no undo.</strong></td></tr>
              <tr><td><strong>Deactivate a style</strong></td><td>Edit → toggle Active off → Save</td></tr>
              <tr><td><strong>Reorder styles</strong></td><td>Edit → change Sort Order. Lower = first.</td></tr>
            </tbody>
          </table>
        </div>

        <h4>Fields</h4>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Field</th><th>Required</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td>Label</td><td>✅</td><td>Display name (e.g., "Traditional Corporate")</td></tr>
              <tr><td>Slug</td><td>✅</td><td>Unique URL-safe key (e.g., <code>traditional-corporate</code>)</td></tr>
              <tr><td>Description</td><td>❌</td><td>Subtitle shown in user dropdown</td></tr>
              <tr><td>System Prompt</td><td>✅</td><td>Full AI instructions shaping resume output</td></tr>
              <tr><td>Active</td><td>—</td><td>Visibility toggle for end users</td></tr>
              <tr><td>Sort Order</td><td>—</td><td>Integer controlling display order (default: 0)</td></tr>
            </tbody>
          </table>
        </div>

        <h3>3. Admin User Management</h3>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Action</th><th>How</th></tr></thead>
            <tbody>
              <tr><td><strong>View current admins</strong></td><td>Listed in the "Users" tab with truncated user IDs</td></tr>
              <tr><td><strong>Add a new admin</strong></td><td>Paste user UUID → click "Add Admin"</td></tr>
              <tr><td><strong>Remove an admin</strong></td><td>Click 🗑️. You cannot remove yourself.</td></tr>
            </tbody>
          </table>
        </div>

        <h3>4. Security Architecture</h3>
        <ul>
          <li><strong>Server-side enforcement:</strong> <code>has_role()</code> PostgreSQL function (<code>SECURITY DEFINER</code>). Cannot be bypassed from client.</li>
          <li><strong>RLS policies:</strong> Non-admins cannot modify <code>resume_prompt_styles</code> or <code>user_roles</code>.</li>
          <li><strong>Frontend gating:</strong> <code>useAdminRole</code> hook is UI-only — enforcement is always at the database layer.</li>
        </ul>

        <h3>5. Troubleshooting</h3>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Issue</th><th>Solution</th></tr></thead>
            <tbody>
              <tr><td>"You don't have admin access"</td><td>UUID not in <code>user_roles</code> with role <code>admin</code>. Ask an existing admin.</td></tr>
              <tr><td>Style not appearing for users</td><td>Verify <code>is_active = true</code> and save was successful.</td></tr>
              <tr><td>Can't delete a prompt style</td><td>Confirm login + admin role. Check console for RLS errors.</td></tr>
              <tr><td>"Add Admin" fails</td><td>UUID must be a valid, existing auth user.</td></tr>
            </tbody>
          </table>
        </div>

        <hr />

        <h2>Part II — Enhancement Roadmap</h2>

        <h3>Priority Framework</h3>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Priority</th><th>Criteria</th><th>Timeline</th></tr></thead>
            <tbody>
              <tr><td><strong>P0 — Critical</strong></td><td>Security risk, data loss, or blocks core workflow</td><td>Sprint 1 (1–2 weeks)</td></tr>
              <tr><td><strong>P1 — High</strong></td><td>Major usability gap; required for managing &gt;10 users</td><td>Sprint 2 (2–4 weeks)</td></tr>
              <tr><td><strong>P2 — Medium</strong></td><td>Operational efficiency; nice-to-have</td><td>Sprint 3 (4–8 weeks)</td></tr>
              <tr><td><strong>P3 — Low</strong></td><td>Scale features; valuable at 100+ users</td><td>Backlog</td></tr>
            </tbody>
          </table>
        </div>

        <h3>P0 — Critical Infrastructure</h3>
        <ul>
          <li><strong>P0.1</strong> — Destructive action confirmations (AlertDialog)</li>
          <li><strong>P0.2</strong> — Rate limiting infrastructure (<code>generation_usage</code> table)</li>
          <li><strong>P0.3</strong> — Admin audit log</li>
          <li><strong>P0.4</strong> — Soft-delete for prompt styles</li>
        </ul>

        <h3>P1 — User Management & Visibility</h3>
        <ul>
          <li><strong>P1.1</strong> — User directory with search</li>
          <li><strong>P1.2</strong> — User block / unblock system</li>
          <li><strong>P1.3</strong> — Bulk user operations</li>
          <li><strong>P1.4</strong> — Admin dashboard home tab</li>
          <li><strong>P1.5</strong> — Tabbed admin layout</li>
        </ul>

        <h3>P2 — Analytics & Governance</h3>
        <ul>
          <li><strong>P2.1</strong> — Usage analytics dashboard</li>
          <li><strong>P2.2</strong> — Role granularity (moderator)</li>
          <li><strong>P2.3</strong> — GDPR/CCPA data export</li>
          <li><strong>P2.4</strong> — In-app notification system</li>
          <li><strong>P2.5</strong> — Generation error queue</li>
        </ul>

        <h3>P3 — AI Agents & Scale</h3>
        <ul>
          <li><strong>P3.1</strong> — Usage anomaly detector agent</li>
          <li><strong>P3.2</strong> — Prompt quality evaluator agent</li>
          <li><strong>P3.3</strong> — Support triage bot</li>
          <li><strong>P3.4</strong> — Onboarding monitor</li>
          <li><strong>P3.5</strong> — Content safety scanner</li>
          <li><strong>P3.6</strong> — Stale account cleanup</li>
        </ul>

        <hr />

        <h3>Implementation Order</h3>
        <div className="font-mono text-xs bg-muted p-4 rounded-lg space-y-1">
          <p className="font-semibold text-foreground">Sprint 1 (P0):</p>
          <p className="text-muted-foreground pl-4">1. P0.1 — AlertDialog confirmations</p>
          <p className="text-muted-foreground pl-4">2. P0.3 — Audit log table + logging</p>
          <p className="text-muted-foreground pl-4">3. P0.4 — Soft-delete for styles</p>
          <p className="text-muted-foreground pl-4">4. P0.2 — Rate limiting table + checks</p>
          <p className="font-semibold text-foreground mt-2">Sprint 2 (P1):</p>
          <p className="text-muted-foreground pl-4">5. P1.5 — Tabbed layout refactor</p>
          <p className="text-muted-foreground pl-4">6. P1.1 — User directory</p>
          <p className="text-muted-foreground pl-4">7. P1.4 — Dashboard home tab</p>
          <p className="text-muted-foreground pl-4">8. P1.2 — Block/unblock system</p>
          <p className="text-muted-foreground pl-4">9. P1.3 — Bulk operations</p>
          <p className="font-semibold text-foreground mt-2">Sprint 3 (P2):</p>
          <p className="text-muted-foreground pl-4">10–14. Error queue, analytics, notifications, moderator role, GDPR export</p>
        </div>

        <p className="text-xs text-muted-foreground mt-6">Version 3.0 — Last updated 2026-03-04</p>
      </div>
    </ScrollArea>
  );
}

// ---------- Main Admin Component ----------

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  create_style: { label: 'Create', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  update_style: { label: 'Update', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  delete_style: { label: 'Delete', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  restore_style: { label: 'Restore', className: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  grant_admin: { label: 'Grant', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  revoke_admin: { label: 'Revoke', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
};

type TopUser = { user_id: string; count: number; email?: string };

function AdminRateLimitsTab() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - 86400_000).toISOString();
      const { data, error } = await supabase
        .from('generation_usage')
        .select('user_id, created_at')
        .gte('created_at', since);
      if (error) throw error;
      const rows = data || [];
      setTotalToday(rows.length);
      // Aggregate by user
      const counts: Record<string, number> = {};
      for (const r of rows) {
        counts[r.user_id] = (counts[r.user_id] || 0) + 1;
      }
      const sorted = Object.entries(counts)
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopUsers(sorted);
    } catch (err: any) {
      toast({ title: 'Error loading usage data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" /> Current Rate Limits
          </CardTitle>
          <CardDescription>Hardcoded per-user generation limits applied across all edge functions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">20</p>
              <p className="text-xs text-muted-foreground">per hour</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">100</p>
              <p className="text-xs text-muted-foreground">per day</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Limits are enforced server-side in each generation edge function. Exceeding returns HTTP 429.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Top Users (Last 24h)
              </CardTitle>
              <CardDescription>Total generations today: <strong>{totalToday}</strong></CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No generations in the last 24 hours.</p>
          ) : (
            <div className="space-y-1.5">
              {topUsers.map((u, i) => (
                <div key={u.user_id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border text-sm">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right">#{i + 1}</span>
                  <span className="font-mono text-xs text-foreground flex-1">{u.user_id.slice(0, 8)}…</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, (u.count / 100) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{u.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminAuditTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      setEntries(await getAuditLog(50));
    } catch (err: any) {
      toast({ title: 'Error loading audit log', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" /> Audit Log
            </CardTitle>
            <CardDescription>Immutable record of all admin actions.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No audit entries yet.</p>
        ) : (
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-1.5 pr-3">
              {entries.map((entry) => {
                const badge = ACTION_BADGE[entry.action] || { label: entry.action, className: 'bg-muted text-muted-foreground' };
                const meta = entry.metadata as Record<string, unknown>;
                const targetLabel = (meta?.label as string) || (meta?.slug as string) || (meta?.user_id as string)?.slice(0, 8) || entry.target_id.slice(0, 8);
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="flex-1 truncate text-foreground">{targetLabel}</span>
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{entry.admin_id.slice(0, 6)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}


export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useAdminRole();

  const [styles, setStyles] = useState<ResumePromptStyle[]>([]);
  const [admins, setAdmins] = useState<Array<{ id: string; user_id: string; role: string }>>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editStyle, setEditStyle] = useState<Partial<ResumePromptStyle> | null>(null);
  const [saving, setSaving] = useState(false);

  // Add admin state
  const [newAdminId, setNewAdminId] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Confirmation dialog state
  const [deleteStyleTarget, setDeleteStyleTarget] = useState<ResumePromptStyle | null>(null);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [removeAdminTarget, setRemoveAdminTarget] = useState<string | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<ResumePromptStyle | null>(null);
  const [hardDeleteConfirmSlug, setHardDeleteConfirmSlug] = useState("");
  const [trashOpen, setTrashOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!roleLoading && isAdmin) loadData();
  }, [roleLoading, isAdmin]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [stylesData, adminsData] = await Promise.all([
        getAllResumeStyles(),
        getAdminUsers(),
      ]);
      setStyles(stylesData);
      setAdmins(adminsData);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveStyle = async () => {
    if (!editStyle?.label || !editStyle?.slug || !editStyle?.system_prompt) {
      toast({ title: "Missing fields", description: "Label, slug, and system prompt are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editStyle.id) {
        await updateResumeStyle(editStyle.id, {
          label: editStyle.label,
          slug: editStyle.slug,
          system_prompt: editStyle.system_prompt,
          description: editStyle.description || undefined,
          is_active: editStyle.is_active,
          sort_order: editStyle.sort_order,
        });
      } else {
        await createResumeStyle({
          label: editStyle.label,
          slug: editStyle.slug,
          system_prompt: editStyle.system_prompt,
          description: editStyle.description || undefined,
          is_active: editStyle.is_active ?? true,
          sort_order: editStyle.sort_order ?? 99,
        });
      }
      toast({ title: "Saved", description: "Prompt style saved successfully." });
      setEditOpen(false);
      setEditStyle(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStyle = async (id: string) => {
    try {
      await deleteResumeStyle(id);
      toast({ title: "Deleted", description: "Prompt style deleted." });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminId.trim()) return;
    setAddingAdmin(true);
    try {
      await addAdminRole(newAdminId.trim());
      toast({ title: "Admin added", description: "User has been granted admin access." });
      setNewAdminId("");
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (userId === currentUserId) {
      toast({ title: "Cannot remove yourself", description: "You cannot remove your own admin access.", variant: "destructive" });
      return;
    }
    if (userId === PROTECTED_ADMIN_ID) {
      toast({ title: "Protected account", description: "This founder admin account cannot be removed.", variant: "destructive" });
      return;
    }
    try {
      await removeAdminRole(userId);
      toast({ title: "Removed", description: "Admin access revoked." });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">You don't have admin access.</p>
        <Button variant="outline" onClick={() => navigate("/profile")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage resume prompt styles, admin users, and view the user guide</p>
          </div>
        </div>

        <Tabs defaultValue="prompts">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="prompts" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Prompts
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="limits" className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" /> Limits
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1.5">
              <ScrollText className="h-3.5 w-3.5" /> Audit
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Guide
            </TabsTrigger>
          </TabsList>

          {/* Prompts Tab */}
          <TabsContent value="prompts">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Resume Prompt Styles
                </CardTitle>
                <CardDescription>These prompts control how AI-generated resumes are structured and styled.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingData ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                  <>
                    {/* Active styles */}
                    {styles.filter(s => !s.deleted_at).map((style) => (
                      <div
                        key={style.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{style.label}</span>
                            {!style.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          </div>
                          {style.description && (
                            <p className="text-xs text-muted-foreground truncate">{style.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => { setEditStyle(style); setEditOpen(true); }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => { setDeleteStyleTarget(style); setDeleteConfirmSlug(""); }}
                            className="text-destructive hover:text-destructive"
                            title="Move to Trash"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Trash section */}
                    {styles.filter(s => !!s.deleted_at).length > 0 && (
                      <Collapsible open={trashOpen} onOpenChange={setTrashOpen} className="mt-4">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Trash2 className="h-3.5 w-3.5" />
                              Trash ({styles.filter(s => !!s.deleted_at).length})
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${trashOpen ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1.5 mt-1.5">
                          {styles.filter(s => !!s.deleted_at).map((style) => {
                            const deletedDate = new Date(style.deleted_at!);
                            const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24)));
                            return (
                              <div
                                key={style.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium text-sm line-through text-muted-foreground">{style.label}</span>
                                  <p className="text-xs text-muted-foreground">
                                    Deleted {formatDistanceToNow(deletedDate, { addSuffix: true })} · {daysLeft}d left
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={async () => {
                                      try {
                                        await restoreResumeStyle(style.id);
                                        toast({ title: "Restored", description: `"${style.label}" has been restored.` });
                                        loadData();
                                      } catch (err: any) {
                                        toast({ title: "Error", description: err.message, variant: "destructive" });
                                      }
                                    }}
                                    title="Restore"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={() => { setHardDeleteTarget(style); setHardDeleteConfirmSlug(""); }}
                                    className="text-destructive hover:text-destructive"
                                    title="Delete Forever"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline" size="sm"
                  onClick={() => {
                    setEditStyle({ label: "", slug: "", system_prompt: "", description: "", is_active: true, sort_order: styles.length });
                    setEditOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add New Style
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Admin Users
                </CardTitle>
                <CardDescription>Manage who has access to this admin panel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{admin.user_id.slice(0, 8)}...</span>
                      {admin.user_id === currentUserId && <Badge variant="secondary" className="text-xs">You</Badge>}
                      {admin.user_id === PROTECTED_ADMIN_ID && <Badge variant="default" className="text-xs">Founder</Badge>}
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => {
                        if (admin.user_id === currentUserId) {
                          toast({ title: "Cannot remove yourself", description: "You cannot remove your own admin access.", variant: "destructive" });
                        } else if (admin.user_id === PROTECTED_ADMIN_ID) {
                          toast({ title: "Protected account", description: "This founder admin account cannot be removed.", variant: "destructive" });
                        } else {
                          setRemoveAdminTarget(admin.user_id);
                        }
                      }}
                      disabled={admin.user_id === currentUserId || admin.user_id === PROTECTED_ADMIN_ID}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Input
                  placeholder="User ID to grant admin access"
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddAdmin} disabled={!newAdminId.trim() || addingAdmin}>
                  {addingAdmin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add Admin
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit">
            <AdminAuditTab />
          </TabsContent>

          {/* Guide Tab */}
          <TabsContent value="guide">
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
          </TabsContent>
        </Tabs>

        {/* Edit Style Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editStyle?.id ? "Edit" : "Create"} Prompt Style</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input
                  value={editStyle?.label || ""}
                  onChange={(e) => setEditStyle({ ...editStyle, label: e.target.value })}
                  placeholder="e.g. Traditional Corporate"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={editStyle?.slug || ""}
                  onChange={(e) => setEditStyle({ ...editStyle, slug: e.target.value })}
                  placeholder="e.g. traditional-corporate"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description (shown in user dropdown)</Label>
                <Input
                  value={editStyle?.description || ""}
                  onChange={(e) => setEditStyle({ ...editStyle, description: e.target.value })}
                  placeholder="Short description of this style"
                />
              </div>
              <div className="space-y-1.5">
                <Label>System Prompt</Label>
                <Textarea
                  value={editStyle?.system_prompt || ""}
                  onChange={(e) => setEditStyle({ ...editStyle, system_prompt: e.target.value })}
                  rows={10}
                  placeholder="The full system prompt the AI will use..."
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label>Active</Label>
                  <Switch
                    checked={editStyle?.is_active ?? true}
                    onCheckedChange={(v) => setEditStyle({ ...editStyle, is_active: v })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={editStyle?.sort_order ?? 0}
                    onChange={(e) => setEditStyle({ ...editStyle, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveStyle} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Move to Trash Confirmation */}
        <AlertDialog open={!!deleteStyleTarget} onOpenChange={(open) => { if (!open) setDeleteStyleTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move to Trash</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{deleteStyleTarget?.label}</strong> (<code className="text-xs bg-muted px-1 py-0.5 rounded">{deleteStyleTarget?.slug}</code>) will be moved to trash. You can restore it within 30 days.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setDeleteStyleTarget(null); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteStyleTarget) handleDeleteStyle(deleteStyleTarget.id);
                  setDeleteStyleTarget(null);
                }}
              >
                Move to Trash
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Hard Delete Confirmation */}
        <AlertDialog open={!!hardDeleteTarget} onOpenChange={(open) => { if (!open) setHardDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{hardDeleteTarget?.label}</strong> (<code className="text-xs bg-muted px-1 py-0.5 rounded">{hardDeleteTarget?.slug}</code>). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label className="text-sm">Type <strong>{hardDeleteTarget?.slug}</strong> to confirm:</Label>
              <Input
                value={hardDeleteConfirmSlug}
                onChange={(e) => setHardDeleteConfirmSlug(e.target.value)}
                placeholder={hardDeleteTarget?.slug}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setHardDeleteTarget(null); setHardDeleteConfirmSlug(""); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={hardDeleteConfirmSlug !== hardDeleteTarget?.slug}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (hardDeleteTarget) {
                    try {
                      await hardDeleteResumeStyle(hardDeleteTarget.id);
                      toast({ title: "Permanently deleted", description: `"${hardDeleteTarget.label}" has been permanently deleted.` });
                      loadData();
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                    }
                  }
                  setHardDeleteTarget(null);
                  setHardDeleteConfirmSlug("");
                }}
              >
                Delete Forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Admin Confirmation */}
        <AlertDialog open={!!removeAdminTarget} onOpenChange={(open) => { if (!open) setRemoveAdminTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
              <AlertDialogDescription>
                This will revoke admin privileges for user <code className="text-xs bg-muted px-1 py-0.5 rounded">{removeAdminTarget?.slice(0, 8)}...</code>. They will lose access to this panel immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (removeAdminTarget) handleRemoveAdmin(removeAdminTarget);
                  setRemoveAdminTarget(null);
                }}
              >
                Remove Admin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
