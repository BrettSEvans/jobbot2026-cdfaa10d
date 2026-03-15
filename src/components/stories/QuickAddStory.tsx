import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { useCreateStory } from "@/hooks/useStories";
import { Epic } from "@/hooks/useEpics";
import { toast } from "sonner";

interface QuickAddStoryProps { epics: Epic[]; }

export function QuickAddStory({ epics }: QuickAddStoryProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [epicId, setEpicId] = useState(epics[0]?.id ?? "");
  const create = useCreateStory();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !epicId) return;
    create.mutate({ epic_id: epicId, title: title.trim(), source: "chat", status: "todo" }, {
      onSuccess: () => { toast.success("Story added to board"); setTitle(""); setOpen(false); },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip><TooltipTrigger asChild>
        <PopoverTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Story</Button></PopoverTrigger>
      </TooltipTrigger><TooltipContent>Quickly add a new story</TooltipContent></Tooltip>
      <PopoverContent className="w-80" align="end">
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-medium text-foreground">Quick add story</p>
          <Input placeholder="Story title..." value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <Select value={epicId} onValueChange={setEpicId}>
            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{epics.map((e) => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="submit" size="sm" className="w-full" disabled={create.isPending}>Add</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
