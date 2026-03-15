import { useSubTasks, useCreateStory, Story } from "@/hooks/useStories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { toast } from "sonner";

const statusIcons: Record<string, React.ReactNode> = {
  done: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
};

interface StorySubTasksProps {
  parentStory: Story;
  onSubTaskClick?: (story: Story) => void;
}

export function StorySubTasks({ parentStory, onSubTaskClick }: StorySubTasksProps) {
  const { data: subtasks, isLoading } = useSubTasks(parentStory.id);
  const createStory = useCreateStory();
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createStory.mutate(
      { title: newTitle.trim(), epic_id: parentStory.epic_id, parent_story_id: parentStory.id, status: "todo" },
      { onSuccess: () => { setNewTitle(""); toast.success("Sub-task added"); } }
    );
  };

  const doneCount = subtasks?.filter((s) => s.status === "done").length ?? 0;
  const totalCount = subtasks?.length ?? 0;

  return (
    <div className="space-y-3">
      {totalCount > 0 && <div className="text-xs text-muted-foreground">{doneCount}/{totalCount} complete</div>}
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      <div className="space-y-1.5">
        {subtasks?.map((st) => (
          <div key={st.id} className="flex items-center gap-2 rounded-md bg-secondary/50 border border-border px-2.5 py-1.5 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onSubTaskClick?.(st)}>
            {statusIcons[st.status] ?? <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
            <span className="text-xs text-foreground flex-1 truncate">{st.title}</span>
            <Badge variant="secondary" className="text-[10px]">{st.status}</Badge>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-border pt-3">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Add sub-task…" className="text-xs h-8"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} />
        <Button size="sm" className="h-8" onClick={handleAdd} disabled={!newTitle.trim()}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
