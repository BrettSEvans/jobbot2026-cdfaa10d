/**
 * Banner shown when asset generation fails.
 * Displays the error message and offers a retry button.
 */
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerationErrorBannerProps {
  error: string | null;
  status: string;
  onRetry: () => void;
  retrying?: boolean;
  assetLabel?: string;
}

export default function GenerationErrorBanner({
  error,
  status,
  onRetry,
  retrying,
  assetLabel = "asset",
}: GenerationErrorBannerProps) {
  if (status !== "error" && status !== "failed") return null;

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {assetLabel} generation failed
          </p>
          <p className="text-xs text-muted-foreground">
            {error || "An unexpected error occurred during generation. Please try again."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Retry Generation
        </Button>
        <span className="text-[11px] text-muted-foreground">
          If this persists, try refreshing the page.
        </span>
      </div>
    </div>
  );
}
