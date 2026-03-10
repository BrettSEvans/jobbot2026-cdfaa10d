import { useMemo, useCallback, useState } from "react";
import type { JobApplication } from "@/hooks/useApplicationDetail";
import type { PipelineStage } from "@/lib/pipelineStages";

interface StalePipelinePromptConfig {
  stage: PipelineStage;
  thresholdMs: number;
  storageKey: string;
}

/**
 * Detects the oldest application stuck in a given pipeline stage
 * beyond a time threshold, with localStorage-based dismissal.
 */
export function useStalePipelinePrompt(
  applications: JobApplication[],
  { stage, thresholdMs, storageKey }: StalePipelinePromptConfig,
) {
  // Counter to force re-evaluation after dismiss
  const [tick, setTick] = useState(0);

  const staleApp = useMemo(() => {
    // tick is read to trigger recalc
    void tick;
    const now = Date.now();
    const dismissed: string[] = JSON.parse(
      localStorage.getItem(storageKey) || "[]",
    );
    return (
      applications
        .filter((app) => {
          const appStage = app.pipeline_stage || "bookmarked";
          if (appStage !== stage) return false;
          if (dismissed.includes(app.id)) return false;
          const changedAt = app.stage_changed_at || app.created_at;
          return now - new Date(changedAt).getTime() > thresholdMs;
        })
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )[0] || null
    );
  }, [applications, stage, thresholdMs, storageKey, tick]);

  const dismiss = useCallback(
    (appId: string) => {
      const dismissed: string[] = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      );
      dismissed.push(appId);
      localStorage.setItem(storageKey, JSON.stringify(dismissed));
      setTick((t) => t + 1);
    },
    [storageKey],
  );

  return { staleApp, dismiss };
}
