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
  ArrowLeft, Edit3, Plus, Trash2, Loader2, Shield, FileText, Users, BookOpen, ScrollText, RotateCcw, ChevronDown, Gauge, FileCode, UserCheck, CreditCard,
} from "lucide-react";
import ApprovalQueue from "@/components/ApprovalQueue";
import {
  getAllResumeStyles, createResumeStyle, updateResumeStyle, deleteResumeStyle,
  restoreResumeStyle, hardDeleteResumeStyle,
  getAdminUsers, addAdminRole, removeAdminRole,
  type ResumePromptStyle,
} from "@/lib/api/adminPrompts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Extracted tab components
import AdminGuideTab from "@/components/admin/AdminGuideTab";
import AdminGenerationGuideTab from "@/components/admin/AdminGenerationGuideTab";
import AdminRateLimitsTab from "@/components/admin/AdminRateLimitsTab";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import AdminSubscriptionsTab from "@/components/admin/AdminSubscriptionsTab";

// Protected founder admin — cannot be removed via UI
const PROTECTED_ADMIN_ID = "f8182de6-de8e-4c12-9009-88fb5c4e66b8";

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

        <Tabs defaultValue="approvals">
          <TabsList className="w-full grid grid-cols-8">
            <TabsTrigger value="approvals" className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5" /> Approvals
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Prompts
            </TabsTrigger>
            <TabsTrigger value="gen-guide" className="flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5" /> Gen Guide
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Subs
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

          <TabsContent value="approvals">
            <ApprovalQueue />
          </TabsContent>

          <TabsContent value="gen-guide">
            <AdminGenerationGuideTab />
          </TabsContent>

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
                            aria-label={`Edit ${style.label}`}
                            onClick={() => { setEditStyle(style); setEditOpen(true); }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => { setDeleteStyleTarget(style); setDeleteConfirmSlug(""); }}
                            className="text-destructive hover:text-destructive"
                            aria-label={`Delete ${style.label}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

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
                                    aria-label={`Restore ${style.label}`}
                                    onClick={async () => {
                                      try {
                                        await restoreResumeStyle(style.id);
                                        toast({ title: "Restored", description: `"${style.label}" has been restored.` });
                                        loadData();
                                      } catch (err: any) {
                                        toast({ title: "Error", description: err.message, variant: "destructive" });
                                      }
                                    }}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={() => { setHardDeleteTarget(style); setHardDeleteConfirmSlug(""); }}
                                    className="text-destructive hover:text-destructive"
                                    aria-label={`Permanently delete ${style.label}`}
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
                      <span className="font-mono text-xs text-muted-foreground break-all">{admin.user_id}</span>
                      {admin.user_id === currentUserId && <Badge variant="secondary" className="text-xs">You</Badge>}
                      {admin.user_id === PROTECTED_ADMIN_ID && <Badge variant="default" className="text-xs">Founder</Badge>}
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      aria-label={`Remove admin ${admin.user_id}`}
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

          <TabsContent value="limits">
            <AdminRateLimitsTab />
          </TabsContent>

          <TabsContent value="audit">
            <AdminAuditTab />
          </TabsContent>

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
                This will revoke admin privileges for user <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{removeAdminTarget}</code>. They will lose access to this panel immediately.
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
