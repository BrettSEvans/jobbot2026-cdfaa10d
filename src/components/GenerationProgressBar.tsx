import { useState, useEffect } from "react";
import { Check, Loader2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type PipelineStage = "scraping" | "branding" | "analyzing" | "research" | "cover-letter" | "dashboard" | "generating-assets" | "complete";

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "scraping", label: "Scraping Job" },
  { key: "branding", label: "Branding" },
  { key: "analyzing", label: "Analyzing" },
  { key: "research", label: "Researching" },
  { key: "cover-letter", label: "Cover Letter" },
  { key: "dashboard", label: "Dashboard" },
  { key: "generating-assets", label: "Assets" },
  { key: "complete", label: "Done" },
];

// Average seconds per stage (empirical estimates)
const STAGE_ESTIMATES: Record<string, number> = {
  scraping: 8,
  branding: 10,
  analyzing: 12,
  research: 15,
  "cover-letter": 20,
  dashboard: 45,
  "generating-assets": 60,
};

function stageIndex(stage: PipelineStage): number {
  return STAGES.findIndex((s) => s.key === stage);
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

interface GenerationProgressBarProps {
  currentStage: PipelineStage;
  error?: string;
  onCancel?: () => void;
  startedAt?: number;
}

export default function GenerationProgressBar({ currentStage, error, onCancel, startedAt }: GenerationProgressBarProps) {
  const currentIdx = stageIndex(currentStage);
  const isActive = currentStage !== "complete" && !error;

  // Tick every second for elapsed time
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const elapsedSec = startedAt ? Math.floor((now - startedAt) / 1000) : 0;

  // Estimate remaining: sum of estimated seconds for remaining stages
  const remainingSec = isActive
    ? STAGES.slice(currentIdx).reduce((sum, s) => sum + (STAGE_ESTIMATES[s.key] || 0), 0)
    : 0;

  return (
    <div className="w-full space-y-3">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx || currentStage === "complete";
          const isActiveStep = idx === currentIdx && currentStage !== "complete";
          const isPending = idx > currentIdx;

          return (
            <div key={stage.key} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                  isDone && "bg-primary text-primary-foreground",
                  isActiveStep && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background",
                  isPending && "bg-muted text-muted-foreground",
                  error && isActiveStep && "bg-destructive/20 text-destructive ring-destructive"
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : isActiveStep ? (
                  error ? "!" : <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium text-center leading-tight",
                  isDone && "text-primary",
                  isActiveStep && "text-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            error ? "bg-destructive" : "bg-primary"
          )}
          style={{
            width: `${currentStage === "complete" ? 100 : (currentIdx / (STAGES.length - 1)) * 100}%`,
          }}
        />
      </div>

      {/* Time estimate + Error + Cancel */}
      <div className="flex items-center justify-center gap-4">
        {isActive && startedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTime(elapsedSec)} elapsed</span>
            {remainingSec > 0 && (
              <span className="text-muted-foreground/60">· ~{formatTime(remainingSec)} remaining</span>
            )}
          </div>
        )}
        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}
        {isActive && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs text-muted-foreground hover:text-destructive">
            <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel Generation
          </Button>
        )}
      </div>
    </div>
  );
}
