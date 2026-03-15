import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StorySidebar } from "@/components/stories/StorySidebar";
import { SprintView } from "@/components/stories/SprintView";
import { KanbanBoard } from "@/components/stories/KanbanBoard";
import { SprintCharts } from "@/components/stories/SprintCharts";
import { StoryDialog } from "@/components/stories/StoryDialog";
import { QuickAddStory } from "@/components/stories/QuickAddStory";
import { StoryFilterBar, StoryFilters } from "@/components/stories/StoryFilterBar";
import { BulkActionBar } from "@/components/stories/BulkActionBar";
import { ExportButton } from "@/components/stories/ExportButton";
import { CommandPalette } from "@/components/stories/CommandPalette";
import { MobileBottomNav } from "@/components/stories/MobileBottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSprints } from "@/hooks/useSprints";
import { useEpics } from "@/hooks/useEpics";
import { useStories, Story } from "@/hooks/useStories";
import { useProfiles } from "@/hooks/useProfiles";
import { useSprintStoryCounts } from "@/hooks/useSprintStoryCounts";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useMemo, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence } from "framer-motion";
import { parseISO, isBefore, startOfDay } from "date-fns";

export default function StoryBoard() {
  const { data: sprints, isLoading: loadingSprints } = useSprints();
  const { data: profiles } = useProfiles();
  const { data: sprintCountsData } = useSprintStoryCounts();
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [editStory, setEditStory] = useState<Story | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<StoryFilters>({ search: "", priority: "all", persona: "all", labels: [], overdueOnly: false });
  const [activeTab, setActiveTab] = useState("sprint");

  const { data: allEpicsData } = useEpics();

  const activeSprint = useMemo(() => {
    if (selectedSprintId) return selectedSprintId;
    return sprints?.find((s) => s.status !== "reference")?.id ?? null;
  }, [sprints, selectedSprintId]);

  const { data: epics } = useEpics(activeSprint ?? undefined);
  const epicIds = useMemo(() => epics?.map((e) => e.id) ?? [], [epics]);
  const { data: stories, isLoading: loadingStories } = useStories(epicIds);

  const storyCountsBySprint = sprintCountsData?.storyCounts ?? {};
  const doneCountsBySprint = sprintCountsData?.doneCounts ?? {};

  const personas = useMemo(() => {
    if (!stories) return [];
    const set = new Set<string>();
    stories.forEach((s) => { if (s.persona) set.add(s.persona); });
    return Array.from(set).sort();
  }, [stories]);

  const allLabels = useMemo(() => {
    if (!stories) return [];
    const set = new Set<string>();
    stories.forEach((s) => (s.labels ?? []).forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [stories]);

  const filteredStories = useMemo(() => {
    if (!stories) return [];
    const q = filters.search.toLowerCase();
    const today = startOfDay(new Date());
    return stories.filter((s) => {
      if (filters.priority !== "all" && s.priority !== filters.priority) return false;
      if (filters.persona !== "all" && s.persona !== filters.persona) return false;
      if (filters.labels.length > 0 && !filters.labels.some((l) => (s.labels ?? []).includes(l))) return false;
      if (filters.overdueOnly && (!s.due_date || !isBefore(parseISO(s.due_date), today))) return false;
      if (q && !s.title.toLowerCase().includes(q) && !(s.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [stories, filters]);

  const selectedSprint = sprints?.find((s) => s.id === activeSprint);

  const handleStoryClick = (story: Story) => { setEditStory(story); setDialogOpen(true); };
  const handleCreateStory = useCallback(() => { setEditStory(null); setDialogOpen(true); }, []);
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  useKeyboardShortcuts({ onCreateStory: handleCreateStory, onCommandPalette: () => setCommandOpen(true) });

  if (loadingSprints) {
    return <div className="flex items-center justify-center h-[60vh]"><Skeleton className="w-64 h-8" /></div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-[calc(100vh-3.5rem)] flex w-full">
        <StorySidebar sprints={sprints ?? []} storyCounts={storyCountsBySprint} doneCounts={doneCountsBySprint}
          selectedSprintId={activeSprint} onSelectSprint={setSelectedSprintId} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 gap-3 shrink-0">
            <SidebarTrigger />
            <h1 className="text-sm font-semibold text-foreground truncate flex-1">{selectedSprint?.name ?? "Story Board"}</h1>
            <ExportButton stories={filteredStories} epics={epics ?? []} sprintName={selectedSprint?.name} />
            {epics && <QuickAddStory epics={epics} />}
          </header>
          <main className="flex-1 p-4 overflow-auto pb-20 sm:pb-4">
            {!activeSprint ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <p className="text-muted-foreground text-sm text-center max-w-xs">Select a sprint from the sidebar to begin, or create your first sprint in the database.</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="hidden sm:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
                  <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="sprint" className="flex-1 sm:flex-initial">Sprint</TabsTrigger>
                    <TabsTrigger value="kanban" className="flex-1 sm:flex-initial">Kanban</TabsTrigger>
                    <TabsTrigger value="charts" className="flex-1 sm:flex-initial">Charts</TabsTrigger>
                  </TabsList>
                  <StoryFilterBar filters={filters} onChange={setFilters} personas={personas} allLabels={allLabels} />
                </div>
                <div className="sm:hidden"><StoryFilterBar filters={filters} onChange={setFilters} personas={personas} allLabels={allLabels} /></div>
                <TabsContent value="sprint">
                  {loadingStories ? <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                    <SprintView epics={epics ?? []} stories={filteredStories} sprintOrder={selectedSprint?.sprint_order ?? 0}
                      onStoryClick={handleStoryClick} selectedIds={selectedIds} onToggleSelect={toggleSelect} profiles={profiles} />
                  )}
                </TabsContent>
                <TabsContent value="kanban">
                  {loadingStories ? <Skeleton className="h-64 w-full" /> : (
                    <KanbanBoard stories={filteredStories} epics={epics ?? []} sprintOrder={selectedSprint?.sprint_order ?? 0}
                      onStoryClick={handleStoryClick} selectedIds={selectedIds} onToggleSelect={toggleSelect} profiles={profiles} />
                  )}
                </TabsContent>
                <TabsContent value="charts">
                  <SprintCharts sprint={selectedSprint} stories={filteredStories} allStories={stories ?? []} allEpics={epics ?? []} sprints={sprints ?? []} />
                </TabsContent>
              </Tabs>
            )}
          </main>
        </div>
      </div>
      <AnimatePresence>
        <BulkActionBar selectedIds={selectedIds} onClear={() => setSelectedIds(new Set())} sprints={sprints} allEpics={allEpicsData} />
      </AnimatePresence>
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <StoryDialog open={dialogOpen} onOpenChange={setDialogOpen} story={editStory} epics={epics ?? []} profiles={profiles} />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} stories={stories ?? []} sprints={sprints ?? []}
        onStoryClick={handleStoryClick} onSprintClick={setSelectedSprintId} onCreateStory={handleCreateStory} />
    </SidebarProvider>
  );
}
