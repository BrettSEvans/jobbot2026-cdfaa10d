

# Extract Dynamic Asset & ATS Hooks from ApplicationDetail.tsx

## New Files

### 1. `src/hooks/useDynamicAssets.ts` (~80 lines)

Encapsulates all dynamic asset state and logic currently on lines 78-258 of `ApplicationDetail.tsx`:

```typescript
function useDynamicAssets(
  appId: string | undefined,
  appState: Pick<ApplicationState, 'jobDescription' | 'companyName' | 'jobTitle' | 'app'>
): {
  dynamicAssets: GeneratedAsset[];
  hasProposals: boolean;
  dynamicLoading: boolean;
  showProposalDialog: boolean;
  setShowProposalDialog: (v: boolean) => void;
  handleAssetsConfirmed: (assets: GeneratedAsset[]) => Promise<void>;
  generateDynamicAsset: (asset: GeneratedAsset) => Promise<void>;
  handleAssetUpdated: (updated: GeneratedAsset) => void;
}
```

Moves: `dynamicAssets`/`hasProposals`/`dynamicLoading` state, the mount-load `useEffect`, `generateDynamicAsset`, `handleAssetsConfirmed`, and `handleAssetUpdated`.

### 2. `src/hooks/useAtsAutoScore.ts` (~70 lines)

Encapsulates ATS score state and auto-trigger logic currently on lines 84-160:

```typescript
function useAtsAutoScore(
  appId: string | undefined,
  resumeHtml: string,
  jobDescription: string,
  app: JobApplication | null
): {
  atsScore: AtsScoreResult | null;
  atsLoading: boolean;
  handleAtsRescan: () => Promise<void>;
  handleApplyBulletFix: (original: string, replacement: string) => Promise<boolean>;
}
```

Moves: `atsScore`/`atsLoading` state, `prevResumeHtmlRef`/`atsAutoTriggered` refs, both `useEffect`s, `handleAtsRescan`, and `handleApplyBulletFix`. The bullet-fix hook will accept `resumeHtml`, `setResumeHtml`, and `saveField` from the parent state so it can apply changes.

## Changes to `ApplicationDetail.tsx`

- Remove ~180 lines of state declarations, effects, and handler functions (lines 78-259)
- Replace with two hook calls:
  ```typescript
  const dynamicAssetState = useDynamicAssets(id, state);
  const atsState = useAtsAutoScore(id, state.resumeHtml, state.jobDescription, state.app, state.setResumeHtml, state.saveField);
  ```
- Update JSX references from `dynamicAssets` → `dynamicAssetState.dynamicAssets`, `atsScore` → `atsState.atsScore`, etc.
- File drops from ~549 lines to ~370 lines

## Net Effect

Two focused, testable hooks. `ApplicationDetail.tsx` becomes purely a layout/routing component. Zero behavioral changes.

