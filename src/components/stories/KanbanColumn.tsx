import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Story, StoryStatus } from "@/hooks/useStories";
import { CopyPromptButton } from "./CopyPromptButton";
import { LabelBadges } from "./LabelBadges";
import { AssigneeAvatar } from "./AssigneeAvatar";
import { Profile } from "@/hooks/useProfiles";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Archive, GitFork, CalendarIcon } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";

const statusColors: Record<string, string> = {
  backlog: "border-muted-foreground/30", todo: "border-primary/40",
  in_progress: "border-accent/50", review: "border-orange-400/50", done: "border-green-500/50",
};

const priorityDots: Record<string, string> = {
  critical: "bg-destructive", high: "bg-orange-400", medium: "bg-primary", low: "bg-muted-foreground",
};

interface KanbanColumnProps {
  status: StoryStatus; label: string; stories: Story[];
  ticketIdMap?: Record<string, string>;
  subTaskCounts?: Record<string, { total: number; done: number }>;
  onStoryClick: (story: Story) => void;
  selectedIds?: Set<string>; onToggleSelect?: (id: string) => void;
  profiles?: Profile[];
}

function DraggableCard({ story, ticketId, onStoryClick, subTaskCount, selected, onToggleSelect, profiles }: {
  story: Story; ticketId?: string; onStoryClick: (s: Story) => void;
  subTaskCount?: { total: number; done: number }; selected?: boolean;
  onToggleSelect?: (id: string) => void; profiles?: Profile[];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: story.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 };
  const dueDiff = story.due_date ? differenceInDays(parseISO(story.due_date), new Date()) : null;
  const dueColor = dueDiff !== null ? (dueDiff < 0 ? "text-destructive" : dueDiff <= 2 ? "text-orange-400" : "text-muted-foreground") : "";

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`rounded-md border border-border bg-card p-3 cursor-grab hover:border-primary/40 shadow-sm hover:shadow-md transition-shadow duration-150 group active:cursor-grabbing touch-none ${story.source === "prompt-archive" ? "border-l-2 border-l-violet-500/40" : ""} ${selected ? "ring-1 ring-primary/50 bg-primary/5" : ""}`}
      onClick={(e) => { if (!isDragging) onStoryClick(story); }}>
      <div className="flex items-start gap-2">
        {onToggleSelect && (
          <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(story.id)} onClick={(e) => e.stopPropagation()}
            className="mt-0.5 opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity" />
        )}
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${priorityDots[story.priority] ?? priorityDots.medium}`} />
        <div className="flex-1 min-w-0">
          {ticketId && <span className="text-[10px] font-mono text-muted-foreground">{ticketId}</span>}
          <span className="text-xs text-foreground leading-snug block">{story.title}</span>
        </div>
      </div>
      <LabelBadges labels={story.labels} max={3} />
      <div className="flex items-center gap-2 mt-2">
        {story.source === "prompt-archive" && <span className="text-[10px] text-violet-400 flex items-center gap-0.5"><Archive size={10} />Archived</span>}
        {story.due_date && <span className={`text-[10px] flex items-center gap-0.5 ${dueColor}`}><CalendarIcon className="h-2.5 w-2.5" />{format(parseISO(story.due_date), "MMM d")}</span>}
        {subTaskCount && subTaskCount.total > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><GitFork size={10} />{subTaskCount.done}/{subTaskCount.total}</span>}
        {story.story_points && <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">{story.story_points}pt</span>}
        {story.persona && <span className="text-[10px] text-muted-foreground truncate">{story.persona}</span>}
        {story.lovable_prompt && <div className="ml-auto" onClick={(e) => e.stopPropagation()}><CopyPromptButton prompt={story.lovable_prompt} ticketId={ticketId} /></div>}
        <AssigneeAvatar profile={profiles?.find((p) => p.id === story.assigned_to)} />
      </div>
      {story.lovable_prompt && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{story.lovable_prompt}</p>}
    </div>
  );
}

export function KanbanColumn({ status, label, stories, ticketIdMap, subTaskCounts, onStoryClick, selectedIds, onToggleSelect, profiles }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef}
      className={`flex flex-col min-w-[220px] w-full rounded-lg border-t-2 ${statusColors[status]} bg-secondary/20 transition-all duration-150 ${isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{label}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">{stories.length}</Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-260px)]">
        {stories.map((story) => (
          <DraggableCard key={story.id} story={story} ticketId={ticketIdMap?.[story.id]} onStoryClick={onStoryClick}
            subTaskCount={subTaskCounts?.[story.id]} selected={selectedIds?.has(story.id)} onToggleSelect={onToggleSelect} profiles={profiles} />
        ))}
      </div>
    </div>
  );
}
