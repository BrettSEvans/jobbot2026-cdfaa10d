import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { Story, STATUSES, useCreateStory, useUpdateStory, useDeleteStory } from "@/hooks/useStories";
import { Epic } from "@/hooks/useEpics";
import { Profile } from "@/hooks/useProfiles";
import { useStoryTemplates, useCreateStoryTemplate } from "@/hooks/useStoryTemplates";
import { toast } from "sonner";
import { Trash2, CalendarIcon, FileText, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { StoryComments } from "./StoryComments";
import { StoryDependencies } from "./StoryDependencies";
import { StorySubTasks } from "./StorySubTasks";
import { LabelInput } from "./LabelInput";

interface StoryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  story?: Story | null;
  epics: Epic[];
  defaultEpicId?: string;
  profiles?: Profile[];
}

export function StoryDialog({ open, onOpenChange, story, epics, defaultEpicId, profiles }: StoryDialogProps) {
  const create = useCreateStory();
  const update = useUpdateStory();
  const remove = useDeleteStory();
  const { data: templates } = useStoryTemplates();
  const createTemplate = useCreateStoryTemplate();
  const isEdit = !!story;

  const [form, setForm] = useState({
    title: "", description: "", acceptance_criteria: "", lovable_prompt: "",
    epic_id: defaultEpicId ?? "", priority: "medium", status: "backlog",
    story_points: "", persona: "", labels: [] as string[],
    due_date: null as Date | null, assigned_to: "", story_tokens: "",
  });

  useEffect(() => {
    if (story) {
      setForm({
        title: story.title, description: story.description ?? "",
        acceptance_criteria: story.acceptance_criteria ?? "",
        lovable_prompt: story.lovable_prompt ?? "", epic_id: story.epic_id,
        priority: story.priority, status: story.status,
        story_points: story.story_points?.toString() ?? "",
        persona: story.persona ?? "", labels: story.labels ?? [],
        due_date: story.due_date ? new Date(story.due_date) : null,
        assigned_to: story.assigned_to ?? "",
        story_tokens: story.story_tokens?.toString() ?? "",
      });
    } else {
      setForm({
        title: "", description: "", acceptance_criteria: "", lovable_prompt: "",
        epic_id: defaultEpicId ?? epics[0]?.id ?? "", priority: "medium",
        status: "backlog", story_points: "", persona: "", labels: [],
        due_date: null, assigned_to: "", story_tokens: "",
      });
    }
  }, [story, defaultEpicId, epics, open]);

  const handleSubmit = () => {
    if (!form.title.trim() || !form.epic_id) { toast.error("Title and epic are required"); return; }
    const payload = {
      title: form.title, description: form.description || undefined,
      acceptance_criteria: form.acceptance_criteria || undefined,
      lovable_prompt: form.lovable_prompt || undefined, epic_id: form.epic_id,
      priority: form.priority, status: form.status,
      story_points: form.story_points ? parseInt(form.story_points) : undefined,
      persona: form.persona || undefined, labels: form.labels,
      due_date: form.due_date ? format(form.due_date, "yyyy-MM-dd") : undefined,
      source: isEdit ? story!.source : "chat",
      assigned_to: form.assigned_to || null,
      story_tokens: form.story_tokens ? parseInt(form.story_tokens) : null,
    } as any;
    if (isEdit) {
      update.mutate({ id: story!.id, _oldStory: story!, ...payload } as any, { onSuccess: () => { onOpenChange(false); toast.success("Story updated"); } });
    } else {
      create.mutate(payload, { onSuccess: () => { onOpenChange(false); toast.success("Story created"); } });
    }
  };

  const handleDelete = () => {
    if (story) remove.mutate(story.id, { onSuccess: () => { onOpenChange(false); toast.success("Story deleted"); } });
  };

  const loadTemplate = (t: { description: string | null; acceptance_criteria: string | null; labels: string[]; priority: string }) => {
    setForm((prev) => ({
      ...prev,
      description: t.description ?? prev.description,
      acceptance_criteria: t.acceptance_criteria ?? prev.acceptance_criteria,
      labels: t.labels?.length ? t.labels : prev.labels,
      priority: t.priority ?? prev.priority,
    }));
    toast.success("Template loaded");
  };

  const handleSaveTemplate = () => {
    const name = prompt("Template name:");
    if (!name?.trim()) return;
    createTemplate.mutate({ name: name.trim(), description: form.description, acceptance_criteria: form.acceptance_criteria, labels: form.labels, priority: form.priority },
      { onSuccess: () => toast.success("Template saved") });
  };

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-full">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Story" : "New Story"}</DialogTitle></DialogHeader>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details">Details</TabsTrigger>
            {isEdit && <TabsTrigger value="subtasks">Sub-tasks</TabsTrigger>}
            {isEdit && <TabsTrigger value="dependencies">Dependencies</TabsTrigger>}
            {isEdit && <TabsTrigger value="comments">Comments</TabsTrigger>}
          </TabsList>
          <TabsContent value="details">
            <div className="grid gap-4 py-2">
              <div className="flex items-center gap-2">
                {templates && templates.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><FileText className="h-3 w-3" /> Load Template</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1" align="start">
                      {templates.map((t) => (
                        <button key={t.id} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors" onClick={() => loadTemplate(t)}>{t.name}</button>
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
                {isEdit && (
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSaveTemplate}><Save className="h-3 w-3" /> Save as Template</Button>
                )}
              </div>
              <div className="grid gap-2"><Label>Title</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Epic</Label>
                  <Select value={form.epic_id} onValueChange={(v) => set("epic_id", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{epics.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="grid gap-2"><Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => set("priority", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["critical", "high", "medium", "low"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>Points</Label><Input type="number" value={form.story_points} onChange={(e) => set("story_points", e.target.value)} /></div>
                  <div className="grid gap-2"><Label>Tokens</Label><Input type="number" value={form.story_tokens} onChange={(e) => set("story_tokens", e.target.value)} placeholder="e.g. 50000" /></div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Labels</Label><LabelInput labels={form.labels} onChange={(l) => set("labels", l)} /></div>
                <div className="grid gap-2"><Label>Due Date</Label>
                  <Popover><PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal h-9", !form.due_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />{form.due_date ? format(form.due_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.due_date ?? undefined} onSelect={(d) => set("due_date", d ?? null)} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent></Popover>
                </div>
              </div>
              <div className="grid gap-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
              <div className="grid gap-2"><Label>Acceptance Criteria</Label><Textarea rows={3} value={form.acceptance_criteria} onChange={(e) => set("acceptance_criteria", e.target.value)} /></div>
              <div className="grid gap-2"><Label>Lovable Prompt</Label><Textarea rows={4} value={form.lovable_prompt} onChange={(e) => set("lovable_prompt", e.target.value)} placeholder="Paste-ready prompt for Lovable chat..." /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Persona</Label><Input value={form.persona} onChange={(e) => set("persona", e.target.value)} /></div>
                <div className="grid gap-2"><Label>Assignee</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => set("assigned_to", v === "unassigned" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(profiles ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name ?? p.id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
          {isEdit && story && <TabsContent value="subtasks"><div className="py-2"><StorySubTasks parentStory={story} /></div></TabsContent>}
          {isEdit && story && <TabsContent value="dependencies"><div className="py-2"><StoryDependencies storyId={story.id} /></div></TabsContent>}
          {isEdit && story && <TabsContent value="comments"><div className="py-2"><StoryComments storyId={story.id} /></div></TabsContent>}
        </Tabs>
        <DialogFooter className="flex justify-between">
          {isEdit && <Button variant="destructive" size="sm" onClick={handleDelete} className="mr-auto"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>}
          <Button onClick={handleSubmit}>{isEdit ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
