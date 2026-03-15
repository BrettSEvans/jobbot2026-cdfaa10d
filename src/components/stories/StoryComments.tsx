import { useComments, useCreateComment } from "@/hooks/useComments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Bot } from "lucide-react";

interface StoryCommentsProps {
  storyId: string;
}

export function StoryComments({ storyId }: StoryCommentsProps) {
  const { data: comments, isLoading } = useComments(storyId);
  const createComment = useCreateComment();
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    createComment.mutate({ story_id: storyId, content: text.trim() }, {
      onSuccess: () => setText(""),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto">
        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {comments?.length === 0 && !isLoading && (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No comments yet</p>
          </div>
        )}
        {comments?.map((c) => {
          const isSystem = c.author_name === "System";
          return (
            <div key={c.id} className={`rounded-md border border-border p-2.5 ${isSystem ? "bg-muted/30 border-dashed" : "bg-secondary/50"}`}>
              <div className="flex items-center gap-2 mb-1">
                {isSystem && <Bot className="h-3 w-3 text-muted-foreground" />}
                <span className={`text-xs font-medium ${isSystem ? "text-muted-foreground italic" : "text-foreground"}`}>{c.author_name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className={`text-sm whitespace-pre-wrap ${isSystem ? "text-muted-foreground italic" : "text-foreground/90"}`}>{c.content}</p>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <Button size="sm" onClick={handleSubmit} disabled={!text.trim() || createComment.isPending}>
          Post
        </Button>
      </div>
    </div>
  );
}
