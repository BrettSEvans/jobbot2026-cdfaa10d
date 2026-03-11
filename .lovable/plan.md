

## Fix: Wand Button Not Appearing After Saving Failure Notes

### Root Cause

The `updateFailureNotes` function in `useQATestRuns.ts` updates the database but does **not** reload results afterward. The wand button's visibility condition checks `savedResult?.failure_notes`, which remains `null` until results are reloaded. The notes appear saved in the UI (local state shows "✓ Saved") but the parent's `savedResult` object is stale.

### Fix

**File: `src/hooks/useQATestRuns.ts`** (line ~142)
- Add `await loadResults(runId);` at the end of `updateFailureNotes` so the results array (and thus `savedResult`) is refreshed after notes are persisted.

This single-line change ensures the wand button appears immediately after failure notes are saved, without requiring a page refresh.

