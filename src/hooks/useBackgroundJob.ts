import { useSyncExternalStore, useCallback } from "react";
import { backgroundGenerator, GenerationJob } from "@/lib/backgroundGenerator";

/**
 * Subscribe to a single background job by applicationId.
 * Only re-renders when *this* job's data changes — other jobs don't trigger updates.
 */
export function useBackgroundJob(applicationId: string | undefined): GenerationJob | undefined {
  const subscribe = useCallback(
    (onStoreChange: () => void) => backgroundGenerator.subscribe(onStoreChange),
    []
  );

  const getSnapshot = useCallback(
    () => (applicationId ? backgroundGenerator.getJob(applicationId) : undefined),
    [applicationId]
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Returns the count of active (non-complete, non-error) background jobs.
 */
export function useActiveJobCount(): number {
  const subscribe = useCallback(
    (onStoreChange: () => void) => backgroundGenerator.subscribe(onStoreChange),
    []
  );

  const getSnapshot = useCallback(() => backgroundGenerator.getActiveCount(), []);

  return useSyncExternalStore(subscribe, getSnapshot);
}
