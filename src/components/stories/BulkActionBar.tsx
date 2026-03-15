import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Trash2 } from "lucide-react";
import { STATUSES, useUpdateStory, useDeleteStory } from "@/hooks/useStories";
import { Sprint } from "@/hooks/useSprints";
import { Epic } from "@/hooks/useEpics";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface BulkActionBarProps {
  selectedIds: Set<string>; onClear: () => void;
  sprints?: Sprint[]; allEpics?: Epic[];
}

export function BulkActionBar({ selectedIds, onClear, sprints, allEpics }: BulkActionBarProps) {
  const update = useUpdateStory();
  const remove = useDeleteStory();
  const count = selectedIds.size;
  if (count === 0) return null;

  const applyStatus = (status: string) => { selectedIds.forEach((id) => update.mutate({ id, status: status as any })); toast.success(`Updated ${count} stories`); onClear(); };
  const applyPriority = (priority: string) => { selectedIds.forEach((id) => update.mutate({ id, priority })); toast.success(`Updated ${count} stories`); onClear(); };
  const moveToSprint = (sprintId: string) => {
    const targetEpic = allEpics?.find((e) => e.sprint_id === sprintId);
    if (!targetEpic) { toast.error("No epics found in target sprint"); return; }
    selectedIds.forEach((id) => update.mutate({ id, epic_id: targetEpic.id }));
    toast.success(`Moved ${count} stories`); onClear();
  };
  const handleDelete = () => { selectedIds.forEach((id) => remove.mutate(id)); toast.success(`Deleted ${count} stories`); onClear(); };

  return (
    <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 shadow-xl">
      <span className="text-xs font-medium text-foreground">{count} selected</span>
      <Select onValueChange={applyStatus}><SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select>
      <Select onValueChange={applyPriority}><SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>{["critical", "high", "medium", "low"].map((p) => <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>)}</SelectContent></Select>
      {sprints && sprints.length > 0 && (
        <Select onValueChange={moveToSprint}><SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue placeholder="Move to Sprint" /></SelectTrigger>
          <SelectContent>{sprints.filter((s) => s.status !== "reference").map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}</SelectContent></Select>
      )}
      <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={handleDelete}><Trash2 className="h-3 w-3" /> Delete</Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onClear}><X className="h-3 w-3" /> Clear</Button>
    </motion.div>
  );
}
