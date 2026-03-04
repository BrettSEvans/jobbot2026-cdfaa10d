import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

function stageIndex(stage: PipelineStage): number {
  return STAGES.findIndex((s) => s.key === stage);
}

interface GenerationProgressBarProps {
  currentStage: PipelineStage;
  error?: string;
}

export default function GenerationProgressBar({ currentStage, error }: GenerationProgressBarProps) {
  const currentIdx = stageIndex(currentStage);

  return (
    <div className="w-full space-y-3">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx || currentStage === "complete";
          const isActive = idx === currentIdx && currentStage !== "complete";
          const isPending = idx > currentIdx;

          return (
            <div key={stage.key} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                  isDone && "bg-primary text-primary-foreground",
                  isActive && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background",
                  isPending && "bg-muted text-muted-foreground",
                  error && isActive && "bg-destructive/20 text-destructive ring-destructive"
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : isActive ? (
                  error ? "!" : <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium text-center leading-tight",
                  isDone && "text-primary",
                  isActive && "text-foreground",
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

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
