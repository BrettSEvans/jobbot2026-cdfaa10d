/**
 * Kanban board view for application pipeline stages.
 * Supports drag & drop, bulk selection, and days-in-stage badges.
 */
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import CompanyIcon from "@/components/CompanyIcon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  isIllogicalTransition,
  daysInStage,
  updatePipelineStage,
  type PipelineStage,
} from "@/lib/pipelineStages";
import type { JobApplication } from "@/hooks/useApplicationDetail";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckSquare, X, ArrowRight } from "lucide-react";

interface KanbanBoardProps {
  applications: JobApplication[];
  onStageChanged: () => void;
}

function DaysInStageBadge({ stageChangedAt, createdAt }: { stageChangedAt?: string | null; createdAt: string }) {
  const ref = stageChangedAt || createdAt;
  const days = daysInStage(ref);
  const isStale = days >= 7;
  const isWarning = days >= 3 && days < 7;
  return (
    <Badge
      variant="outline"
      className={`text-xs gap-1 ${
        isStale
          ? "border-destructive/50 text-destructive"
          : isWarning
          ? "border-yellow-500/50 text-yellow-700 dark:text-yellow-400"
          : "text-muted-foreground"
      }`}
    >
      <Clock className="h-3 w-3" />
      {days}d
    </Badge>
  );
}

export default function KanbanBoard({ applications, onStageChanged }: KanbanBoardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingMove, setPendingMove] = useState<{
    appId: string;
    from: PipelineStage;
    to: PipelineStage;
    appName: string;
  } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<PipelineStage | "">("");
  const [bulkMoving, setBulkMoving] = useState(false);

  const isBulkMode = selectedIds.size > 0;

  const columns = useMemo(() => {
    const map: Record<PipelineStage, JobApplication[]> = {} as any;
    for (const stage of PIPELINE_STAGES) map[stage] = [];
    for (const app of applications) {
      const stage = ((app as any).pipeline_stage || "bookmarked") as PipelineStage;
      if (map[stage]) map[stage].push(app);
      else map.bookmarked.push(app);
    }
    return map;
  }, [applications]);

  const toggleSelect = (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkTarget("");
  };

  const executeBulkMove = async () => {
    if (!bulkTarget || selectedIds.size === 0) return;
    setBulkMoving(true);
    let moved = 0;
    try {
      for (const appId of selectedIds) {
        const app = applications.find((a) => a.id === appId);
        if (!app) continue;
        const fromStage = ((app as any).pipeline_stage || "bookmarked") as PipelineStage;
        if (fromStage === bulkTarget) continue;
        await updatePipelineStage(appId, fromStage, bulkTarget as PipelineStage);
        moved++;
      }
      toast({
        title: "Bulk update complete",
        description: `Moved ${moved} application${moved !== 1 ? "s" : ""} to ${STAGE_LABELS[bulkTarget as PipelineStage]}`,
      });
      clearSelection();
      onStageChanged();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBulkMoving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData("text/plain", appId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(appId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent, toStage: PipelineStage) => {
      e.preventDefault();
      setDraggedId(null);
      const appId = e.dataTransfer.getData("text/plain");
      if (!appId) return;
      const app = applications.find((a) => a.id === appId);
      if (!app) return;
      const fromStage = ((app as any).pipeline_stage || "bookmarked") as PipelineStage;
      if (fromStage === toStage) return;
      if (isIllogicalTransition(fromStage, toStage)) {
        setPendingMove({
          appId,
          from: fromStage,
          to: toStage,
          appName: app.company_name || "This application",
        });
        return;
      }
      await executeMove(appId, fromStage, toStage);
    },
    [applications]
  );

  const executeMove = async (appId: string, from: PipelineStage, to: PipelineStage) => {
    try {
      await updatePipelineStage(appId, from, to);
      toast({ title: "Stage updated", description: `Moved to ${STAGE_LABELS[to]}` });
      onStageChanged();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const confirmPendingMove = async () => {
    if (!pendingMove) return;
    await executeMove(pendingMove.appId, pendingMove.from, pendingMove.to);
    setPendingMove(null);
  };

  const mainStages = PIPELINE_STAGES.filter((s) => s !== "rejected") as PipelineStage[];

  const renderCard = (app: JobApplication, dimmed = false) => (
    <Card
      key={app.id}
      draggable={!isBulkMode}
      onDragStart={(e) => handleDragStart(e, app.id)}
      onDragEnd={() => setDraggedId(null)}
      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        draggedId === app.id ? "opacity-50" : ""
      } ${dimmed ? "opacity-70" : ""} ${
        selectedIds.has(app.id) ? "ring-2 ring-primary" : ""
      }`}
      onClick={(e) => {
        if (isBulkMode) {
          toggleSelect(app.id, e);
        } else {
          navigate(`/applications/${app.id}`);
        }
      }}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          {isBulkMode && (
            <Checkbox
              checked={selectedIds.has(app.id)}
              onCheckedChange={() =>
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(app.id)) next.delete(app.id);
                  else next.add(app.id);
                  return next;
                })
              }
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            />
          )}
          <CompanyIcon
            iconUrl={(app as any).company_icon_url}
            companyName={app.company_name}
            size={18}
          />
          <span className="text-sm font-medium truncate">{app.company_name || "Unknown"}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{app.job_title || "Unknown Role"}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <DaysInStageBadge
            stageChangedAt={(app as any).stage_changed_at}
            createdAt={app.created_at}
          />
          {(app as any).ats_score?.score != null && (
            <Badge variant="outline" className="text-xs">
              ATS: {(app as any).ats_score.score}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderColumn = (stage: PipelineStage, borderClass = "border-border/50", bgClass = "bg-muted/20") => (
    <div
      key={stage}
      className="min-w-[220px] w-[220px] shrink-0 snap-start"
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, stage)}
    >
      <div className="flex items-center gap-2 mb-2 px-1">
        <Badge variant="outline" className={`text-xs ${STAGE_COLORS[stage]}`}>
          {STAGE_LABELS[stage]}
        </Badge>
        <span className="text-xs text-muted-foreground">{columns[stage].length}</span>
      </div>
      <div className={`space-y-2 min-h-[100px] rounded-lg border border-dashed ${borderClass} p-2 ${bgClass}`}>
        {columns[stage].map((app) => renderCard(app, stage === "rejected"))}
      </div>
    </div>
  );

  return (
    <>
      {/* Bulk action bar */}
      {isBulkMode && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 mb-3">
          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Select value={bulkTarget} onValueChange={(v) => setBulkTarget(v as PipelineStage)}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="Move to…" />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!bulkTarget || bulkMoving}
            onClick={executeBulkMove}
          >
            {bulkMoving ? "Moving…" : "Move"}
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Tip for bulk mode */}
      {!isBulkMode && applications.length > 1 && (
        <p className="text-xs text-muted-foreground mb-2">
          <span className="font-medium">Tip:</span> Click cards without dragging to select multiple, then move them in bulk.
        </p>
      )}

      <div
        className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {mainStages.map((stage) => renderColumn(stage))}

        {/* Rejected column (visually distinct) */}
        {columns.rejected.length > 0 &&
          renderColumn("rejected", "border-destructive/30", "bg-destructive/5")}
      </div>

      {/* Illogical transition confirmation */}
      <AlertDialog open={!!pendingMove} onOpenChange={(open) => !open && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unusual stage change</AlertDialogTitle>
            <AlertDialogDescription>
              Moving <strong>{pendingMove?.appName}</strong> from{" "}
              <strong>{pendingMove ? STAGE_LABELS[pendingMove.from] : ""}</strong> to{" "}
              <strong>{pendingMove ? STAGE_LABELS[pendingMove.to] : ""}</strong> is an unusual
              transition. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingMove}>Move Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
