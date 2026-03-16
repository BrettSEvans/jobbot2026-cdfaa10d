import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, Play, Pause, Plus } from "lucide-react";
import { Sprint, useUpdateSprintStatus, useCreateSprint } from "@/hooks/useSprints";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useState } from "react";

interface StorySidebarProps {
  sprints: Sprint[];
  storyCounts: Record<string, number>;
  doneCounts: Record<string, number>;
  selectedSprintId: string | null;
  onSelectSprint: (id: string) => void;
}

export function StorySidebar({ sprints, storyCounts, doneCounts, selectedSprintId, onSelectSprint }: StorySidebarProps) {
  const updateStatus = useUpdateSprintStatus();
  const createSprint = useCreateSprint();
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");

  const activeSprints = sprints.filter((s) => s.status !== "reference");
  const refSprints = sprints.filter((s) => s.status === "reference");

  const handleToggleStatus = (sprint: Sprint, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = sprint.status === "active" ? "planned" : "active";
    updateStatus.mutate({ id: sprint.id, status: newStatus }, {
      onSuccess: () => toast.success(`${sprint.name} → ${newStatus}`),
      onError: () => toast.error("Failed to update sprint status"),
    });
  };

  const handleCreateSprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim()) return;
    const nextOrder = sprints.length > 0 ? Math.max(...sprints.map((s) => s.sprint_order)) + 1 : 1;
    createSprint.mutate(
      { name: newSprintName.trim(), sprint_order: nextOrder, status: "planned" },
      {
        onSuccess: (data) => {
          toast.success("Sprint created");
          setNewSprintName("");
          setShowNewSprint(false);
          onSelectSprint(data.id);
        },
        onError: () => toast.error("Failed to create sprint"),
      }
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel>Sprints</SidebarGroupLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewSprint(!showNewSprint)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Sprint</TooltipContent>
            </Tooltip>
          </div>
          {showNewSprint && (
            <form onSubmit={handleCreateSprint} className="px-2 pb-2 space-y-2">
              <Input
                placeholder="Sprint name..."
                value={newSprintName}
                onChange={(e) => setNewSprintName(e.target.value)}
                autoFocus
                className="h-8 text-xs"
              />
              <div className="flex gap-1">
                <Button type="submit" size="sm" className="h-7 text-xs flex-1" disabled={createSprint.isPending}>Create</Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowNewSprint(false)}>Cancel</Button>
              </div>
            </form>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {activeSprints.length === 0 && !showNewSprint && (
                <p className="text-xs text-muted-foreground px-3 py-2">No sprints yet. Click + to create one.</p>
              )}
              {activeSprints.map((sprint) => {
                const total = storyCounts[sprint.id] ?? 0;
                const done = doneCounts[sprint.id] ?? 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <SidebarMenuItem key={sprint.id}>
                    <SidebarMenuButton onClick={() => onSelectSprint(sprint.id)}
                      className={`cursor-pointer h-auto py-2 ${selectedSprintId === sprint.id ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}`}>
                      <LayoutDashboard className="mr-2 h-4 w-4 shrink-0" />
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm">{sprint.name}</span>
                          {sprint.status === "active" && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                          )}
                          <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">{done}/{total}</Badge>
                        </div>
                        {total > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-[10px] text-muted-foreground shrink-0 w-7 text-right">{pct}%</span>
                          </div>
                        )}
                      </div>
                    </SidebarMenuButton>
                    <Tooltip><TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 ml-1" onClick={(e) => handleToggleStatus(sprint, e)}>
                        {sprint.status === "active" ? <Pause className="h-3.5 w-3.5 text-muted-foreground" /> : <Play className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                    </TooltipTrigger><TooltipContent side="right">{sprint.status === "active" ? "Deactivate sprint" : "Activate sprint"}</TooltipContent></Tooltip>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {refSprints.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Reference</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {refSprints.map((sprint) => (
                  <SidebarMenuItem key={sprint.id}>
                    <SidebarMenuButton onClick={() => onSelectSprint(sprint.id)}
                      className={`cursor-pointer ${selectedSprintId === sprint.id ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}`}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span className="truncate text-sm">{sprint.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
