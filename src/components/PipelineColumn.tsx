import { Badge } from "@/components/ui/badge";
import { CompanyIcon } from "@/components/CompanyIcon";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { differenceInDays, parseISO } from "date-fns";
import type { JobApplicationListItem } from "@/types/models";

const stageColors: Record<string, string> = {
  bookmarked: "border-muted-foreground/30",
  applied: "border-primary/40",
  interviewing: "border-accent/50",
  offer: "border-orange-400/50",
  accepted: "border-green-500/50",
  withdrawn: "border-muted-foreground/40",
  ghosted: "border-violet-400/50",
  rejected: "border-destructive/50",
};

function DaysInStageBadge({ stageChangedAt }: { stageChangedAt: string | null }) {
  if (!stageChangedAt) return null;
  const days = differenceInDays(new Date(), parseISO(stageChangedAt));
  const color = days < 5 ? "text-green-500" : days <= 10 ? "text-orange-400" : "text-destructive";
  return <span className={`text-[10px] font-mono ${color}`}>{days}d</span>;
}

function DraggableCard({ app, onClick }: { app: JobApplicationListItem; onClick: (app: JobApplicationListItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-md border border-border bg-card p-3 cursor-grab hover:border-primary/40 shadow-sm hover:shadow-md transition-shadow duration-150 active:cursor-grabbing touch-none"
      onClick={() => { if (!isDragging) onClick(app); }}
    >
      <div className="flex items-start gap-2">
        <CompanyIcon companyName={app.company_name} companyUrl={app.company_url} iconUrl={app.company_icon_url} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-foreground leading-snug block truncate">{app.company_name || "Unknown"}</span>
          <span className="text-[11px] text-muted-foreground leading-snug block truncate">{app.job_title || "Unknown role"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <DaysInStageBadge stageChangedAt={app.stage_changed_at} />
        <Badge variant="secondary" className="text-[10px] ml-auto">{app.pipeline_stage}</Badge>
      </div>
    </div>
  );
}

interface PipelineColumnProps {
  stage: string;
  label: string;
  apps: JobApplicationListItem[];
  onAppClick: (app: JobApplicationListItem) => void;
}

export function PipelineColumn({ stage, label, apps, onAppClick }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[220px] w-full rounded-lg border-t-2 ${stageColors[stage] || "border-muted"} bg-secondary/20 transition-all duration-150 ${isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{label}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">{apps.length}</Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-260px)]">
        {apps.map((app) => (
          <DraggableCard key={app.id} app={app} onClick={onAppClick} />
        ))}
      </div>
    </div>
  );
}
