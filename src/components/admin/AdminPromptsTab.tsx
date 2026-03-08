import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit3, Plus, Trash2, Loader2, FileText, RotateCcw, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  getAllResumeStyles, createResumeStyle, updateResumeStyle, deleteResumeStyle,
  restoreResumeStyle, hardDeleteResumeStyle,
  type ResumePromptStyle,
} from "@/lib/api/adminPrompts";
import { supabase } from "@/integrations/supabase/client";

export default function AdminPromptsTab() {
  const { toast } = useToast();
  const [styles, setStyles] = useState<ResumePromptStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editStyle, setEditStyle] = useState<Partial<ResumePromptStyle> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResumePromptStyle | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<ResumePromptStyle | null>(null);
  const [hardDeleteConfirmSlug, setHardDeleteConfirmSlug] = useState("");
  const [trashOpen, setTrashOpen] = useState(false);

  useEffect(() => { loadStyles(); }, []);

  const loadStyles = async () => {
    setLoading(true);
    try {
      setStyles(await getAllResumeStyles());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editStyle?.label || !editStyle?.slug || !editStyle?.system_prompt) {
      toast({ title: "Missing fields", description: "Label, slug, and system prompt are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editStyle.id) {
        await updateResumeStyle(editStyle.id, {
          label: editStyle.label, slug: editStyle.slug, system_prompt: editStyle.system_prompt,
          description: editStyle.description || undefined, is_active: editStyle.is_active, sort_order: editStyle.sort_order,
        });
      } else {
        await createResumeStyle({
          label: editStyle.label, slug: editStyle.slug, system_prompt: editStyle.system_prompt,
          description: editStyle.description || undefined, is_active: editStyle.is_active ?? true, sort_order: editStyle.sort_order ?? 99,
        });
      }
      toast({ title: "Saved", description: "Prompt style saved." });
      setEditOpen(false);
      setEditStyle(null);
      loadStyles();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResumeStyle(id);
      toast({ title: "Deleted", description: "Moved to trash." });
      loadStyles();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <Card><CardContent className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Resume Prompt Styles
          </CardTitle>
          <CardDescription>Control how AI-generated resumes are structured and styled.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {styles.filter(s => !s.deleted_at).map((style) => (
            <div key={style.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{style.label}</span>
                  {!style.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                </div>
                {style.description && <p className="text-xs text-muted-foreground truncate">{style.description}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditStyle(style); setEditOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(style)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}

          {styles.filter(s => !!s.deleted_at).length > 0 && (
            <Collapsible open={trashOpen} onOpenChange={setTrashOpen} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Trash ({styles.filter(s => !!s.deleted_at).length})</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${trashOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1.5 mt-1.5">
                {styles.filter(s => !!s.deleted_at).map((style) => {
                  const deletedDate = new Date(style.deleted_at!);
                  const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24)));
                  return (
                    <div key={style.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm line-through text-muted-foreground">{style.label}</span>
                        <p className="text-xs text-muted-foreground">Deleted {formatDistanceToNow(deletedDate, { addSuffix: true })} · {daysLeft}d left</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={async () => {
                          try { await restoreResumeStyle(style.id); toast({ title: "Restored" }); loadStyles(); }
                          catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                        }}><RotateCcw className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setHardDeleteTarget(style); setHardDeleteConfirmSlug(""); }} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={() => {
            setEditStyle({ label: "", slug: "", system_prompt: "", description: "", is_active: true, sort_order: styles.length });
            setEditOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" /> Add New Style
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editStyle?.id ? "Edit" : "Create"} Prompt Style</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Label</Label><Input value={editStyle?.label || ""} onChange={(e) => setEditStyle({ ...editStyle, label: e.target.value })} placeholder="e.g. Traditional Corporate" /></div>
            <div className="space-y-1.5"><Label>Slug</Label><Input value={editStyle?.slug || ""} onChange={(e) => setEditStyle({ ...editStyle, slug: e.target.value })} placeholder="e.g. traditional-corporate" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={editStyle?.description || ""} onChange={(e) => setEditStyle({ ...editStyle, description: e.target.value })} placeholder="Short description" /></div>
            <div className="space-y-1.5"><Label>System Prompt</Label><Textarea value={editStyle?.system_prompt || ""} onChange={(e) => setEditStyle({ ...editStyle, system_prompt: e.target.value })} rows={10} className="font-mono text-xs" /></div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2"><Label>Active</Label><Switch checked={editStyle?.is_active ?? true} onCheckedChange={(v) => setEditStyle({ ...editStyle, is_active: v })} /></div>
              <div className="flex items-center gap-2"><Label>Sort Order</Label><Input type="number" value={editStyle?.sort_order ?? 0} onChange={(e) => setEditStyle({ ...editStyle, sort_order: parseInt(e.target.value) || 0 })} className="w-20" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trash Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash</AlertDialogTitle>
            <AlertDialogDescription><strong>{deleteTarget?.label}</strong> will be moved to trash. Restore within 30 days.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) handleDelete(deleteTarget.id); setDeleteTarget(null); }}>Move to Trash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard Delete Confirm */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={(open) => { if (!open) setHardDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete <strong>{hardDeleteTarget?.label}</strong>. Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">Type <strong>{hardDeleteTarget?.slug}</strong> to confirm:</Label>
            <Input value={hardDeleteConfirmSlug} onChange={(e) => setHardDeleteConfirmSlug(e.target.value)} placeholder={hardDeleteTarget?.slug} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setHardDeleteTarget(null); setHardDeleteConfirmSlug(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={hardDeleteConfirmSlug !== hardDeleteTarget?.slug} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
              if (hardDeleteTarget) {
                try { await hardDeleteResumeStyle(hardDeleteTarget.id); toast({ title: "Permanently deleted" }); loadStyles(); }
                catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
              }
              setHardDeleteTarget(null); setHardDeleteConfirmSlug("");
            }}>Delete Forever</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
