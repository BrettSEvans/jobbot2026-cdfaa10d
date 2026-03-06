/**
 * GhostPromptDialog — lonely ghost themed popup for apps stuck in "Applied" for 14+ days.
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

interface GhostPromptDialogProps {
  open: boolean;
  companyName: string;
  onMarkGhosted: () => void;
  onDismiss: () => void;
}

export default function GhostPromptDialog({
  open,
  companyName,
  onMarkGhosted,
  onDismiss,
}: GhostPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent className="max-w-sm text-center border-purple-200 dark:border-purple-800 bg-gradient-to-b from-background to-purple-50/30 dark:to-purple-950/20">
        <DialogHeader className="items-center space-y-4">
          {/* Lonely ghost illustration */}
          <div className="relative mx-auto">
            <span className="text-7xl block animate-bounce" style={{ animationDuration: "3s" }}>
              👻
            </span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-purple-200/50 dark:bg-purple-800/30 blur-sm" />
          </div>
          <DialogTitle className="text-lg font-semibold text-purple-900 dark:text-purple-200">
            It's been 2 weeks…
          </DialogTitle>
          <DialogDescription className="text-sm text-purple-700/80 dark:text-purple-300/70 leading-relaxed max-w-[260px] mx-auto">
            You applied to <strong className="text-foreground">{companyName}</strong> and haven't heard back.
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
