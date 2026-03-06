/**
 * GhostPromptDialog — lonely ghost themed popup for stale applications.
 * Supports "applied" (10-day) and "interviewing" (7-day) triggers.
 * Shown once per application, dismissal tracked via localStorage.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ghostImg from "@/assets/ghost-option-3.png";

interface GhostPromptDialogProps {
  open: boolean;
  companyName: string;
  stage: "applied" | "interviewing";
  onMarkGhosted: () => void;
  onDismiss: () => void;
}

const COPY = {
  applied: {
    title: "It's been 10 days…",
    body: (name: string) => (
      <>
        You applied to <strong className="text-foreground">{name}</strong> and
        haven't heard back.
      </>
    ),
  },
  interviewing: {
    title: "It's been a week…",
    body: (name: string) => (
      <>
        You've been interviewing with{" "}
        <strong className="text-foreground">{name}</strong> with no update.
      </>
    ),
  },
} as const;

export default function GhostPromptDialog({
  open,
  companyName,
  stage,
  onMarkGhosted,
  onDismiss,
}: GhostPromptDialogProps) {
  const copy = COPY[stage];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent className="max-w-sm text-center border-purple-200 dark:border-purple-800 bg-gradient-to-b from-background to-purple-50/30 dark:to-purple-950/20">
        <DialogHeader className="items-center space-y-4">
          {/* Ghost peeking from envelope illustration */}
          <div className="relative mx-auto">
            <img
              src={ghostImg}
              alt="A lonely ghost peeking from an envelope"
              className="w-24 h-24 object-contain animate-bounce"
              style={{ animationDuration: "3s" }}
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-purple-200/50 dark:bg-purple-800/30 blur-sm" />
          </div>
          <DialogTitle className="text-lg font-semibold text-purple-900 dark:text-purple-200">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-purple-700/80 dark:text-purple-300/70 leading-relaxed max-w-[260px] mx-auto">
            {copy.body(companyName)}
            <span className="block mt-2 italic text-purple-500/70 dark:text-purple-400/50">
              Sometimes silence says everything. 🕯️
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
          <Button
            onClick={onMarkGhosted}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            👻 Mark as Ghosted
          </Button>
          <Button
            variant="ghost"
            onClick={onDismiss}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Not yet — still hoping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
