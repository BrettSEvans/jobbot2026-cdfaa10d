import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Edit3, Plus, Trash2, Loader2, Shield, FileText, Users,
} from "lucide-react";
import {
  getAllResumeStyles, createResumeStyle, updateResumeStyle, deleteResumeStyle,
  getAdminUsers, addAdminRole, removeAdminRole,
  type ResumePromptStyle,
} from "@/lib/api/adminPrompts";
import { supabase } from "@/integrations/supabase/client";

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
            <p className="text-sm text-muted-foreground">Manage resume prompt styles and admin users</p>
          </div>
        </div>

        {/* Resume Prompt Styles */}
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
              styles.map((style) => (
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
                      onClick={() => handleDeleteStyle(style.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
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

        {/* User Management */}
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
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => handleRemoveAdmin(admin.user_id)}
                  disabled={admin.user_id === currentUserId}
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
      </div>
    </div>
  );
}
