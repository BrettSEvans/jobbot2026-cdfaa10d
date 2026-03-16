import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { useCreateEpic } from "@/hooks/useEpics";
import { toast } from "sonner";

interface CreateEpicButtonProps {
  sprintId: string;
  existingEpicCount: number;
}

export function CreateEpicButton({ sprintId, existingEpicCount }: CreateEpicButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createEpic = useCreateEpic();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createEpic.mutate(
      { sprint_id: sprintId, name: name.trim(), epic_order: existingEpicCount + 1 },
      {
        onSuccess: () => { toast.success("Epic created"); setName(""); setOpen(false); },
        onError: () => toast.error("Failed to create epic"),
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Epic
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Create a new epic in this sprint</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72" align="end">
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-medium text-foreground">New Epic</p>
          <Input placeholder="Epic name..." value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Button type="submit" size="sm" className="w-full" disabled={createEpic.isPending}>Create Epic</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
