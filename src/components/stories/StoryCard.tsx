import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyPromptButton } from "./CopyPromptButton";
import { LabelBadges } from "./LabelBadges";
import { AssigneeAvatar } from "./AssigneeAvatar";
import { Story, STATUSES, useUpdateStory } from "@/hooks/useStories";
import { Profile } from "@/hooks/useProfiles";
import { Archive, GitFork, CalendarIcon, User, FileText, CheckCircle2, Zap } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { motion } from "framer-motion";

const priorityColors: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-primary/20 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

interface StoryCardProps {
  story: Story;
  ticketId: string;
  onClick?: () => void;
  subTaskCount?: { total: number; done: number };
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  profiles?: Profile[];
}

function DueDateBadge({ dueDate }: { dueDate: string }) {
  const date = parseISO(dueDate);
  const diff = differenceInDays(date, new Date());
  const color = diff < 0 ? "text-destructive" : diff <= 2 ? "text-orange-400" : "text-muted-foreground";
  return (
    <span className={`text-[10px] flex items-center gap-1 shrink-0 ${color}`}>
      <CalendarIcon className="h-3 w-3" />
      {format(date, "MMM d")}
    </span>
  );
}

export function StoryCard({ story, ticketId, onClick, subTaskCount, selected, onToggleSelect, profiles }: StoryCardProps) {
  const updateStory = useUpdateStory();
  const assignee = profiles?.find((p) => p.id === story.assigned_to);

  return (
    <motion.div
      className={`flex flex-col gap-1.5 px-3 py-3 rounded-md bg-secondary/50 border border-border shadow-sm hover:shadow-md cursor-pointer group ${story.source === "prompt-archive" ? "border-l-2 border-l-violet-500/40" : ""} ${selected ? "ring-1 ring-primary/50 bg-primary/5" : ""}`}
      onClick={onClick}
      whileHover={{ scale: 1.01, transition: { type: "spring", stiffness: 400, damping: 25 } }}
      whileTap={{ scale: 0.995 }}
    >
      {/* Row 1: Ticket ID, Title, Status selector */}
      <div className="flex items-center gap-3">
        {onToggleSelect && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(story.id)}
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
          />
        )}
        <span className="text-xs font-mono text-muted-foreground shrink-0 tracking-wider">{ticketId}</span>
        {story.source === "prompt-archive" && (
          <Badge className="text-[10px] px-2 py-0 bg-violet-500/20 text-violet-400 border-violet-500/30 gap-1">
            <Archive size={12} /> Archived
          </Badge>
        )}
        <span className="text-sm text-foreground flex-1 truncate font-medium">{story.title}</span>
        <Select
          value={story.status}
          onValueChange={(v) => updateStory.mutate({ id: story.id, status: v as Story["status"], _oldStory: story } as any)}
        >
          <SelectTrigger className="h-6 w-[100px] text-[11px] border-border bg-background" onClick={(e) => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{statusLabels[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: All metadata badges */}
      <div className="flex items-center gap-2 flex-wrap pl-6">
        <Badge className={`text-[10px] px-2 py-0 ${priorityColors[story.priority] ?? priorityColors.medium}`}>
          {story.priority}
        </Badge>
        <LabelBadges labels={story.labels} max={4} />
        {story.due_date && <DueDateBadge dueDate={story.due_date} />}
        {story.story_points && (
          <span className="text-[10px] text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-medium" title="Story points">
            {story.story_points}
          </span>
        )}
        {story.story_tokens != null && (
          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 shrink-0 font-mono" title="Estimated Lovable tokens">
            <Zap className="inline h-2.5 w-2.5 mr-0.5" />
            {story.story_tokens >= 1000 ? `${(story.story_tokens / 1000).toFixed(0)}k` : story.story_tokens} tok
          </span>
        )}
        {story.persona && (
          <span className="text-[10px] text-muted-foreground bg-muted/50 border border-border rounded px-1.5 py-0.5 shrink-0 flex items-center gap-0.5" title="Persona">
            <User className="h-2.5 w-2.5" /> {story.persona}
          </span>
        )}
        {story.source && story.source !== "chat" && (
          <span className="text-[10px] text-muted-foreground bg-muted/50 border border-border rounded px-1.5 py-0.5 shrink-0" title="Source">
            {story.source}
          </span>
        )}
        {subTaskCount && subTaskCount.total > 0 && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
            <GitFork size={12} /> {subTaskCount.done}/{subTaskCount.total}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <AssigneeAvatar profile={assignee} />
          {story.lovable_prompt && <CopyPromptButton prompt={story.lovable_prompt} ticketId={ticketId} />}
        </div>
      </div>

      {/* Row 3: Description */}
      {story.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 pl-6 flex items-start gap-1">
          <FileText className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{story.description}</span>
        </p>
      )}

      {/* Row 4: Acceptance Criteria (if present) */}
      {story.acceptance_criteria && (
        <p className="text-xs text-muted-foreground/70 line-clamp-1 pl-6 flex items-start gap-1 italic">
          <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-green-500/50" />
          <span>{story.acceptance_criteria}</span>
        </p>
      )}

      {/* Row 5: Lovable Prompt */}
      {story.lovable_prompt && (
        <p className="text-xs text-primary/60 line-clamp-2 pl-6 bg-primary/5 rounded px-2 py-1">
          💬 {story.lovable_prompt}
        </p>
      )}
    </motion.div>
  );
}
