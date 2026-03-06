/**
 * Kanban board view for application pipeline stages.
 * Uses @hello-pangea/dnd for touch-compatible drag & drop.
 */
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface KanbanBoardProps {
  applications: JobApplication[];
  onStageChanged: () => void;
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

  const columns = useMemo(() => {
    const map: Record<PipelineStage, JobApplication[]> = {
      bookmarked: [], applied: [], interviewing: [], offer: [], accepted: [], rejected: [],
    };
    for (const app of applications) {
      const stage = ((app as any).pipeline_stage || 'applied') as PipelineStage;
      if (map[stage]) map[stage].push(app);
      else map.applied.push(app);
    }
    return map;
  }, [applications]);

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData("text/plain", appId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(appId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = useCallback(async (e: React.DragEvent, toStage: PipelineStage) => {
    e.preventDefault();
    setDraggedId(null);
    const appId = e.dataTransfer.getData("text/plain");
    if (!appId) return;

    const app = applications.find((a) => a.id === appId);
    if (!app) return;

    const fromStage = ((app as any).pipeline_stage || 'applied') as PipelineStage;
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
  }, [applications]);

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

  // Filter out rejected for main flow, show separately
  const mainStages = PIPELINE_STAGES.filter((s) => s !== 'rejected') as PipelineStage[];

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollSnapType: 'x mandatory' }}>
        {mainStages.map((stage) => (
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
            <div className="space-y-2 min-h-[100px] rounded-lg border border-dashed border-border/50 p-2 bg-muted/20">
              {columns[stage].map((app) => (
                <Card
                  key={app.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, app.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                    draggedId === app.id ? "opacity-50" : ""
                  }`}
                  onClick={() => navigate(`/applications/${app.id}`)}
                >
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CompanyIcon iconUrl={(app as any).company_icon_url} companyName={app.company_name} size={18} />
                      <span className="text-sm font-medium truncate">{app.company_name || "Unknown"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{app.job_title || "Unknown Role"}</p>
                    <div className="flex items-center gap-2">
                      {(app as any).ats_score?.score != null && (
                        <Badge variant="outline" className="text-xs">
                          ATS: {(app as any).ats_score.score}
                        </Badge>
                      )}
                      {(app as any).stage_changed_at && (
                        <span className="text-xs text-muted-foreground">
                          {daysInStage((app as any).stage_changed_at)}d
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* Rejected column (visually distinct) */}
        {columns.rejected.length > 0 && (
          <div
            className="min-w-[220px] w-[220px] shrink-0 snap-start"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'rejected')}
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              <Badge variant="outline" className={`text-xs ${STAGE_COLORS.rejected}`}>
                {STAGE_LABELS.rejected}
              </Badge>
              <span className="text-xs text-muted-foreground">{columns.rejected.length}</span>
            </div>
            <div className="space-y-2 min-h-[100px] rounded-lg border border-dashed border-destructive/30 p-2 bg-destructive/5">
              {columns.rejected.map((app) => (
                <Card
                  key={app.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, app.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`cursor-grab active:cursor-grabbing opacity-70 ${
                    draggedId === app.id ? "opacity-30" : ""
                  }`}
                  onClick={() => navigate(`/applications/${app.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <CompanyIcon iconUrl={(app as any).company_icon_url} companyName={app.company_name} size={18} />
                      <span className="text-sm font-medium truncate">{app.company_name || "Unknown"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{app.job_title || "Unknown Role"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Illogical transition confirmation */}
      <AlertDialog open={!!pendingMove} onOpenChange={(open) => !open && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unusual stage change</AlertDialogTitle>
            <AlertDialogDescription>
              Moving <strong>{pendingMove?.appName}</strong> from{" "}
              <strong>{pendingMove ? STAGE_LABELS[pendingMove.from] : ""}</strong> to{" "}
              <strong>{pendingMove ? STAGE_LABELS[pendingMove.to] : ""}</strong>{" "}
              is an unusual transition. Are you sure?
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
