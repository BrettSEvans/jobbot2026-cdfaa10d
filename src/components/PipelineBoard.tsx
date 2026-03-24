import { useState, useCallback } from "react";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { updatePipelineStage } from "@/lib/api/jobApplication";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineBulkActionBar } from "./PipelineBulkActionBar";
import { AnimatePresence } from "framer-motion";
import type { JobApplicationListItem } from "@/types/models";

const STAGES = [
  { id: "bookmarked", label: "Bookmarked" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "accepted", label: "Accepted" },
  { id: "withdrawn", label: "Withdrawn" },
  { id: "ghosted", label: "Ghosted" },
  { id: "rejected", label: "Rejected" },
] as const;

interface PipelineBoardProps {
  applications: JobApplicationListItem[];
  onRefresh: () => void;
}

export function PipelineBoard({ applications, onRefresh }: PipelineBoardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const grouped = STAGES.map((s) => ({
    ...s,
    apps: applications.filter((a) => a.pipeline_stage === s.id),
  }));

  const activeApp = activeId ? applications.find((a) => a.id === activeId) : null;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const newStage = over.id as string;
    const draggedApp = applications.find((a) => a.id === active.id);
    if (!draggedApp) return;

    // If dragged card is selected, move all selected; otherwise just the dragged card
    const idsToMove = selectedIds.size > 1 && selectedIds.has(draggedApp.id)
      ? Array.from(selectedIds)
      : [draggedApp.id];

    const appsToMove = idsToMove
      .map((id) => applications.find((a) => a.id === id))
      .filter((a): a is JobApplicationListItem => !!a && a.pipeline_stage !== newStage);

    if (appsToMove.length === 0) return;

    try {
      await Promise.all(appsToMove.map((app) => updatePipelineStage(app.id, newStage, app.pipeline_stage)));
      onRefresh();
      setSelectedIds(new Set());
      toast({ title: "Stage updated", description: `Moved ${appsToMove.length} application${appsToMove.length > 1 ? "s" : ""} to ${newStage}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update stage";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleBulkStageChange = async (newStage: string) => {
    const appsToMove = Array.from(selectedIds)
      .map((id) => applications.find((a) => a.id === id))
      .filter((a): a is JobApplicationListItem => !!a && a.pipeline_stage !== newStage);

    if (appsToMove.length === 0) {
      setSelectedIds(new Set());
      return;
    }

    try {
      await Promise.all(appsToMove.map((app) => updatePipelineStage(app.id, newStage, app.pipeline_stage)));
      onRefresh();
      setSelectedIds(new Set());
      toast({ title: "Stage updated", description: `Moved ${appsToMove.length} application${appsToMove.length > 1 ? "s" : ""} to ${newStage}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update stage";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
          {grouped.map((col) => (
            <PipelineColumn
              key={col.id}
              stage={col.id}
              label={col.label}
              apps={col.apps}
              onAppClick={(app) => navigate(`/applications/${app.id}`)}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
        <DragOverlay>
          {activeApp && (
            <div className="rounded-md border border-primary/40 bg-card p-3 shadow-lg w-[220px] opacity-90">
              <span className="text-xs font-medium block truncate">{activeApp.company_name || "Unknown"}</span>
              <span className="text-[11px] text-muted-foreground block truncate">{activeApp.job_title || "Unknown"}</span>
              {selectedIds.size > 1 && selectedIds.has(activeApp.id) && (
                <span className="text-[10px] text-primary mt-1 block">+{selectedIds.size - 1} more</span>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <AnimatePresence>
        <PipelineBulkActionBar selectedIds={selectedIds} onClear={() => setSelectedIds(new Set())} onBulkStageChange={handleBulkStageChange} />
      </AnimatePresence>
    </>
  );
}
