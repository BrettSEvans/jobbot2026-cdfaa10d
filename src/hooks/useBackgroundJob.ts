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
 * Subscribe to an asset-specific background job.
 */
export function useAssetJob(applicationId: string | undefined, assetType: string): GenerationJob | undefined {
  const subscribe = useCallback(
    (onStoreChange: () => void) => backgroundGenerator.subscribe(onStoreChange),
    []
  );

  const getSnapshot = useCallback(
    () => (applicationId ? backgroundGenerator.getAssetJob(applicationId, assetType) : undefined),
    [applicationId, assetType]
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

/**
 * Returns active asset types for a given application.
 */
export function useActiveAssetTypes(applicationId: string | undefined): string[] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => backgroundGenerator.subscribe(onStoreChange),
    []
  );

  const getSnapshot = useCallback(
    () => (applicationId ? backgroundGenerator.getActiveAssetTypesForApp(applicationId) : []),
    [applicationId]
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}
