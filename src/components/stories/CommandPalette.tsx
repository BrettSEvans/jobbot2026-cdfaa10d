import { useState, useEffect } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Story } from "@/hooks/useStories";
import { Sprint } from "@/hooks/useSprints";

interface CommandPaletteProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  stories: Story[]; sprints: Sprint[];
  onStoryClick: (story: Story) => void;
  onSprintClick: (id: string) => void;
  onCreateStory: () => void;
}

export function CommandPalette({ open, onOpenChange, stories, sprints, onStoryClick, onSprintClick, onCreateStory }: CommandPaletteProps) {
  const [search, setSearch] = useState("");

  useEffect(() => { if (!open) setSearch(""); }, [open]);
  const close = () => onOpenChange(false);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search stories, sprints…" value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { onCreateStory(); close(); }}>Create new story</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Sprints">
          {sprints.map((s) => <CommandItem key={s.id} onSelect={() => { onSprintClick(s.id); close(); }}>{s.name}</CommandItem>)}
        </CommandGroup>
        <CommandGroup heading="Stories">
          {(stories ?? []).slice(0, 20).map((s) => (
            <CommandItem key={s.id} onSelect={() => { onStoryClick(s); close(); }}>
              <span className="truncate">{s.title}</span>
              <span className="ml-auto text-[10px] text-muted-foreground capitalize">{s.status.replace("_", " ")}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
