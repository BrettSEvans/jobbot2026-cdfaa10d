import { Copy, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { forwardRef, useState, Fragment } from "react";
import { toast } from "sonner";

function HighlightedPrompt({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap break-words">
      {lines.map((line, i) => {
        let className = "text-foreground";
        if (/^#{1,3}\s/.test(line)) className = "text-primary font-bold";
        else if (/^\s*[-*•]\s/.test(line)) className = "text-muted-foreground";
        else if (/^\s*\d+[.)]\s/.test(line)) className = "text-muted-foreground";
        else if (/^```/.test(line)) className = "text-accent-foreground bg-accent/20 rounded px-1";
        else if (/^>\s/.test(line)) className = "text-primary/70 border-l-2 border-primary/40 pl-2";
        else if (/^[A-Z][A-Z\s]{4,}:?$/.test(line.trim())) className = "text-primary/80 font-semibold";

        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <Fragment key={i}>
            <span className={className}>
              {parts.map((part, j) => {
                if (/^\*\*(.+)\*\*$/.test(part)) return <strong key={j} className="text-foreground font-bold">{part.slice(2, -2)}</strong>;
                if (/^`(.+)`$/.test(part)) return <code key={j} className="text-accent-foreground bg-accent/20 rounded px-1 text-xs">{part.slice(1, -1)}</code>;
                return <span key={j}>{part}</span>;
              })}
            </span>
            {"\n"}
          </Fragment>
        );
      })}
    </pre>
  );
}

export const CopyPromptButton = forwardRef<HTMLButtonElement, { prompt: string; ticketId?: string }>(
  ({ prompt, ticketId }, ref) => {
    const [copied, setCopied] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const buildFullPrompt = () => {
      const parts: string[] = [];
      if (ticketId) parts.push(`[${ticketId}]`);
      parts.push(prompt);
      parts.push("");
      parts.push("---");
      parts.push(ticketId
        ? `After completing this task, move story ${ticketId} to "Review" status on the kanban board.`
        : `After completing this task, move the story to "Review" status on the kanban board.`
      );
      return parts.join("\n");
    };

    const handleCopy = async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const fullPrompt = buildFullPrompt();
      await navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard", {
        description: fullPrompt.length > 120 ? fullPrompt.slice(0, 120) + "…" : fullPrompt,
        duration: 4000,
      });
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button ref={ref} variant="outline" size="sm" onClick={handleCopy}
            className="h-6 text-[11px] px-2 gap-1 rounded-r-none border-primary/30 text-primary hover:bg-primary/10">
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }}
            className="h-6 text-[11px] px-1.5 rounded-l-none border-l-0 border-primary/30 text-primary hover:bg-primary/10">
            <Eye className="h-3 w-3" />
          </Button>
        </div>
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col w-[calc(100vw-1rem)] sm:w-full">
            <DialogHeader><DialogTitle>Prompt Preview</DialogTitle></DialogHeader>
            <ScrollArea className="flex-1 rounded-md border border-border bg-secondary/30 p-4 max-h-[60vh]">
              <HighlightedPrompt text={buildFullPrompt()} />
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
              <Button size="sm" className="gap-1" onClick={() => { handleCopy(); setPreviewOpen(false); }}>
                <Copy className="h-3.5 w-3.5" /> Copy to Clipboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);
CopyPromptButton.displayName = "CopyPromptButton";
