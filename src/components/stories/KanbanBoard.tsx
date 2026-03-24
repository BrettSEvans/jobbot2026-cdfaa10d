import { STATUSES, Story, StoryStatus, useUpdateStory, useSubTaskCounts } from "@/hooks/useStories";
import { Profile } from "@/hooks/useProfiles";
import { KanbanColumn } from "./KanbanColumn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useCallback, useMemo } from "react";
import { Epic } from "@/hooks/useEpics";
import {
  DndContext, DragOverlay, DragStartEvent, DragEndEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { midpoint } from "@/lib/fractionalIndex";

const statusLabels: Record<StoryStatus, string> = {
  backlog: "Backlog", todo: "To Do", in_progress: "In Progress", review: "Review", done: "Done",
};

const priorityDots: Record<string, string> = {
  critical: "bg-destructive", high: "bg-orange-400", medium: "bg-primary", low: "bg-muted-foreground",
};

type GroupBy = "none" | "epic" | "priority";

interface KanbanBoardProps {
  stories: Story[];
  epics: Epic[];
  sprintOrder: number;
  onStoryClick: (story: Story) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  profiles?: Profile[];
}

export function KanbanBoard({ stories, epics, sprintOrder, onStoryClick, selectedIds, onToggleSelect, profiles }: KanbanBoardProps) {
  const [epicFilter, setEpicFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const updateStory = useUpdateStory();

  const filtered = epicFilter === "all" ? stories : stories.filter((s) => s.epic_id === epicFilter);

  const ticketIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    const epicMap = new Map(epics.map((e) => [e.id, e]));
    const byEpic = new Map<string, Story[]>();
    filtered.forEach((s) => {
      const arr = byEpic.get(s.epic_id) ?? [];
      arr.push(s);
      byEpic.set(s.epic_id, arr);
    });
    byEpic.forEach((epicStories, epicId) => {
      const epic = epicMap.get(epicId);
      const epicOrder = epic?.epic_order ?? 0;
      epicStories
        .sort((a, b) => a.story_order - b.story_order)
        .forEach((s, idx) => { map[s.id] = `TEAM-${sprintOrder}${epicOrder}${(idx + 1).toString().padStart(2, "0")}`; });
    });
    return map;
  }, [filtered, epics, sprintOrder]);

  const storyIds = useMemo(() => filtered.map((s) => s.id), [filtered]);
  const { data: subTaskCounts } = useSubTaskCounts(storyIds);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveStory(filtered.find((s) => s.id === event.active.id) ?? null);
  }, [filtered]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveStory(null);
    const { active, over } = event;
    if (!over) return;
    const storyId = active.id as string;
    const overId = over.id as string;
    const story = filtered.find((s) => s.id === storyId);
    if (!story) return;
    const isColumn = STATUSES.includes(overId as StoryStatus);
    const newStatus = isColumn ? (overId as StoryStatus) : (filtered.find((s) => s.id === overId)?.status ?? story.status);

    // Determine which stories to move: all selected (if dragged card is selected), or just the dragged card
    const idsToMove = selectedIds && selectedIds.size > 1 && selectedIds.has(storyId)
      ? Array.from(selectedIds)
      : [storyId];

    const excludeSet = new Set(idsToMove);
    const columnStories = filtered.filter((s) => s.status === newStatus && !excludeSet.has(s.id)).sort((a, b) => (a.lexical_order ?? "a0").localeCompare(b.lexical_order ?? "a0"));

    let baseOrder: string;
    if (isColumn || columnStories.length === 0) {
      baseOrder = columnStories[columnStories.length - 1]?.lexical_order ?? "";
    } else {
      const overIndex = columnStories.findIndex((s) => s.id === overId);
      if (overIndex <= 0) baseOrder = "";
      else baseOrder = columnStories[overIndex - 1]?.lexical_order ?? "";
    }

    // Assign sequential lexical orders for all moved stories
    let prevOrder = baseOrder;
    for (const id of idsToMove) {
      const s = filtered.find((st) => st.id === id);
      if (!s) continue;
      const newOrder = midpoint(prevOrder, "");
      if (s.status !== newStatus || s.lexical_order !== newOrder) {
        updateStory.mutate({ id, status: newStatus, lexical_order: newOrder, _oldStory: s } as any);
      }
      prevOrder = newOrder;
    }
  }, [filtered, updateStory, selectedIds]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All", stories: filtered }];
    if (groupBy === "epic") {
      const epicMap = new Map(epics.map((e) => [e.id, e]));
      const grouped = new Map<string, Story[]>();
      filtered.forEach((s) => { const arr = grouped.get(s.epic_id) ?? []; arr.push(s); grouped.set(s.epic_id, arr); });
      return Array.from(grouped.entries()).map(([epicId, stories]) => ({
        key: epicId, label: epicMap.get(epicId)?.name ?? "Unknown Epic", color: epicMap.get(epicId)?.color ?? undefined, stories,
      }));
    }
    const priorities = ["critical", "high", "medium", "low"];
    return priorities.map((p) => ({ key: p, label: p.charAt(0).toUpperCase() + p.slice(1), stories: filtered.filter((s) => s.priority === p) })).filter((g) => g.stories.length > 0);
  }, [groupBy, filtered, epics]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Select value={epicFilter} onValueChange={setEpicFilter}>
          <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue placeholder="Filter by epic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Epics</SelectItem>
            {epics.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Group by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Grouping</SelectItem>
            <SelectItem value="epic">Group by Epic</SelectItem>
            <SelectItem value="priority">Group by Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              {groupBy !== "none" && (
                <div className="flex items-center gap-2 mb-2">
                  {(group as any).color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: (group as any).color }} />}
                  <h3 className="text-sm font-semibold text-foreground capitalize">{group.label}</h3>
                  <span className="text-xs text-muted-foreground">({group.stories.length})</span>
                </div>
              )}
              <div className="flex gap-3 overflow-x-auto pb-4">
                {STATUSES.map((status) => {
                  const columnStories = group.stories.filter((s) => s.status === status).sort((a, b) => (a.lexical_order ?? "a0").localeCompare(b.lexical_order ?? "a0"));
                  return (
                    <KanbanColumn key={`${group.key}-${status}`} status={status} label={statusLabels[status]} stories={columnStories}
                      ticketIdMap={ticketIdMap} subTaskCounts={subTaskCounts} onStoryClick={onStoryClick}
                      selectedIds={selectedIds} onToggleSelect={onToggleSelect} profiles={profiles} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeStory ? (
            <div className="rounded-md border border-primary/50 bg-card p-3 shadow-lg w-[220px]" style={{ transform: "rotate(2deg)" }}>
              <div className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${priorityDots[activeStory.priority] ?? priorityDots.medium}`} />
                <span className="text-xs text-foreground leading-snug flex-1">{activeStory.title}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
