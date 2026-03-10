

# Extract `useStalePipelinePrompt` Hook & Merge Copy Handlers

## What Changes

1. **New hook: `src/hooks/useStalePipelinePrompt.ts`** — Consolidates the triplicated stale-app detection + dismiss logic into a single reusable hook parameterized by stage, threshold, and localStorage key.

2. **Merge duplicate copy handlers** — `handleCopyHtml` and `handleCopyCoverLetter` in `Applications.tsx` are identical except for the toast description. Replace with a single `handleCopyToClipboard(text, label, e)`.

3. **Simplify `markAsGhosted`** — The two `markAsGhosted` / `markInterviewAsGhosted` callbacks are identical except for `fromStage` and the dismiss function. Consolidate into one callback that accepts the stage.

## Hook API

```typescript
// src/hooks/useStalePipelinePrompt.ts
interface StalePipelinePromptConfig {
  stage: PipelineStage;
  thresholdMs: number;
  storageKey: string;
}

function useStalePipelinePrompt(
  applications: JobApplication[],
  config: StalePipelinePromptConfig
): {
  staleApp: JobApplication | null;
  dismiss: (appId: string) => void;
}
```

Internal logic: the same `useMemo` filter + sort, and the same `useCallback` dismiss pattern, just parameterized.

## Changes to `Applications.tsx`

- **Remove** lines 99-166 (three `useMemo` blocks + three `useCallback` dismiss handlers)
- **Replace with** three `useStalePipelinePrompt` calls:
  ```typescript
  const { staleApp: staleBookmarkedApp, dismiss: dismissBookmarked } = useStalePipelinePrompt(applications, {
    stage: 'bookmarked', thresholdMs: 48 * 60 * 60 * 1000, storageKey: 'dismissed_bookmarked_prompts'
  });
  const { staleApp: staleAppliedApp, dismiss: dismissApplied } = useStalePipelinePrompt(applications, {
    stage: 'applied', thresholdMs: 10 * 24 * 60 * 60 * 1000, storageKey: 'dismissed_ghost_prompts'
  });
  const { staleApp: staleInterviewingApp, dismiss: dismissInterviewing } = useStalePipelinePrompt(applications, {
    stage: 'interviewing', thresholdMs: 7 * 24 * 60 * 60 * 1000, storageKey: 'dismissed_ghost_interview_prompts'
  });
  ```
- **Remove** `markAsGhosted` and `markInterviewAsGhosted` (lines 168-188), replace with single:
  ```typescript
  const markAsGhosted = useCallback(async (appId: string, fromStage: PipelineStage, dismiss: (id: string) => void) => { ... }, [toast]);
  ```
- **Remove** `handleCopyHtml` and `handleCopyCoverLetter` (lines 310-320), replace with:
  ```typescript
  const handleCopyToClipboard = useCallback(async (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  }, [toast]);
  ```
- Update all call sites (ghost dialogs, bookmarked nudge, ApplicationCommandCard props) to use the new names.

## Net Effect

~70 lines removed from `Applications.tsx`, one new ~40-line hook file. Zero behavioral changes.

