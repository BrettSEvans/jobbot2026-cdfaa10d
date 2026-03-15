import { useStoryLinks, useCreateStoryLink, useDeleteStoryLink, LinkType } from "@/hooks/useStoryLinks";
import { useStories, Story } from "@/hooks/useStories";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const linkLabels: Record<string, string> = {
  blocks: "Blocks",
  relates_to: "Related to",
  duplicates: "Duplicates",
};

interface StoryDependenciesProps {
  storyId: string;
}

export function StoryDependencies({ storyId }: StoryDependenciesProps) {
  const { data: links, isLoading } = useStoryLinks(storyId);
  const { data: allStories } = useStories();
  const createLink = useCreateStoryLink();
  const deleteLink = useDeleteStoryLink();

  const [linkType, setLinkType] = useState<LinkType>("relates_to");
  const [targetId, setTargetId] = useState("");

  const availableStories = (allStories ?? []).filter(
    (s) => s.id !== storyId && !links?.some((l) => l.source_story_id === s.id || l.target_story_id === s.id)
  );

  const handleAdd = () => {
    if (!targetId) return;
    createLink.mutate(
      { source_story_id: storyId, target_story_id: targetId, link_type: linkType },
      {
        onSuccess: () => { setTargetId(""); toast.success("Link added"); },
        onError: () => toast.error("Failed to add link"),
      }
    );
  };

  return (
    <div className="space-y-3">
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {links?.length === 0 && !isLoading && (
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <Link2 className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">No dependencies</p>
        </div>
      )}
      <div className="space-y-1.5">
        {links?.map((link) => {
          const isSource = link.source_story_id === storyId;
          const otherTitle = isSource ? link.target_title : link.source_title;
          const direction = isSource ? linkLabels[link.link_type] : `Blocked by`;
          return (
            <div key={link.id} className="flex items-center gap-2 rounded-md bg-secondary/50 border border-border px-2.5 py-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-medium w-20 shrink-0">{direction}</span>
              <span className="text-xs text-foreground flex-1 truncate">{otherTitle}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteLink.mutate(link.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 items-end border-t border-border pt-3">
        <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="blocks">Blocks</SelectItem>
            <SelectItem value="relates_to">Related to</SelectItem>
            <SelectItem value="duplicates">Duplicates</SelectItem>
          </SelectContent>
        </Select>
        <Select value={targetId} onValueChange={setTargetId}>
          <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Select story…" /></SelectTrigger>
          <SelectContent>
            {availableStories.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8" onClick={handleAdd} disabled={!targetId}>Add</Button>
      </div>
    </div>
  );
}
