import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, GripVertical } from "lucide-react";
import { Story, useUpdateStory } from "@/hooks/useStories";
import { Epic } from "@/hooks/useEpics";
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { StoryCard } from "./StoryCard";
import { midpoint } from "@/lib/fractionalIndex";
import {
  DndContext, DragOverlay, DragStartEvent, DragEndEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Profile } from "@/hooks/useProfiles";

interface SprintViewProps {
  epics: Epic[]; stories: Story[]; sprintOrder: number;
  onStoryClick: (story: Story) => void;
  selectedIds?: Set<string>; onToggleSelect?: (id: string) => void;
  profiles?: Profile[];
}

function ticketId(sprintOrder: number, epicOrder: number, storyOrder: number) {
  return `TEAM-${sprintOrder}${epicOrder}${storyOrder.toString().padStart(2, "0")}`;
}

function SortableStoryCard({ story, ticketId: tid, onClick, selected, onToggleSelect, profiles }: {
  story: Story; ticketId: string; onClick: () => void; selected?: boolean; onToggleSelect?: (id: string) => void; profiles?: Profile[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: story.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity shrink-0 touch-none" style={{ opacity: isDragging ? 1 : undefined }}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <StoryCard story={story} ticketId={tid} onClick={onClick} selected={selected} onToggleSelect={onToggleSelect} profiles={profiles} />
      </div>
    </div>
  );
}

export function SprintView({ epics, stories, sprintOrder, onStoryClick, selectedIds, onToggleSelect, profiles }: SprintViewProps) {
  const [openEpics, setOpenEpics] = useState<Set<string>>(new Set(epics.map((e) => e.id)));
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const updateStory = useUpdateStory();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const toggle = (id: string) => {
    setOpenEpics((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveStory(stories.find((s) => s.id === event.active.id) ?? null);
  }, [stories]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveStory(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const storyId = active.id as string;
    const overId = over.id as string;
    const story = stories.find((s) => s.id === storyId);
    if (!story) return;
    const siblings = stories.filter((s) => s.epic_id === story.epic_id && s.id !== storyId).sort((a, b) => (a.lexical_order ?? "a0").localeCompare(b.lexical_order ?? "a0"));
    const overIndex = siblings.findIndex((s) => s.id === overId);
    if (overIndex < 0) return;
    let newOrder: string;
    if (overIndex === 0) newOrder = midpoint("", siblings[0]?.lexical_order ?? "");
    else newOrder = midpoint(siblings[overIndex - 1]?.lexical_order ?? "", siblings[overIndex]?.lexical_order ?? "");
    updateStory.mutate({ id: storyId, lexical_order: newOrder, _oldStory: story } as any);
  }, [stories, updateStory]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {epics.map((epic) => {
          const epicStories = stories.filter((s) => s.epic_id === epic.id).sort((a, b) => (a.lexical_order ?? "a0").localeCompare(b.lexical_order ?? "a0"));
          const storyIds = epicStories.map((s) => s.id);
          return (
            <Collapsible key={epic.id} open={openEpics.has(epic.id)} onOpenChange={() => toggle(epic.id)}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-secondary/50 transition-all duration-150">
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${openEpics.has(epic.id) ? "rotate-90" : ""}`} />
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: epic.color ?? "hsl(var(--primary))" }} />
                <span className="text-sm font-medium text-foreground">{epic.name}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">{epicStories.length}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-1.5 mt-1">
                {epicStories.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No stories</p>}
                <SortableContext items={storyIds} strategy={verticalListSortingStrategy}>
                  {epicStories.map((story, idx) => (
                    <div key={story.id} className="group">
                      <SortableStoryCard story={story} ticketId={ticketId(sprintOrder, epic.epic_order, idx + 1)} onClick={() => onStoryClick(story)}
                        selected={selectedIds?.has(story.id)} onToggleSelect={onToggleSelect} profiles={profiles} />
                    </div>
                  ))}
                </SortableContext>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
      <DragOverlay>
        {activeStory ? (
          <div className="rounded-md border border-primary/50 bg-card px-3 py-2 shadow-lg max-w-md" style={{ transform: "rotate(2deg)" }}>
            <span className="text-sm text-foreground">{activeStory.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
