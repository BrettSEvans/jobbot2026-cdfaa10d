

## Plan: Rename "Refine with AI" to "Vibe Edit" and Fix Dashboard Iterative Editing

### Summary

Two changes: (1) rename the last "Refine with AI" label and update help text, (2) fix the dashboard vibe edit so sequential edits build on each other instead of restarting from the original.

The cover letter and generated asset vibe edits already work iteratively (they stream directly into React state and block concurrent edits). Only the dashboard vibe edit is broken because it delegates to a background process that saves to DB but never updates the local React state.

---

### Changes

**1. `src/components/DynamicMaterialsSection.tsx`** (line 608)
- Change `"Refine with AI"` to `"Vibe Edit"` on the dashboard chat toggle button

**2. `src/components/HelpDrawer.tsx`**
- Line 325: `"Refine with AI"` → `"Vibe Edit"`
- Line 464: `"Vibe Edit (Refine with AI)"` → `"Vibe Edit"`
- Line 467: `"Refine with AI"` → `"Vibe Edit"`

**3. `src/lib/backgroundGenerator.ts` — Add `onComplete` callback to `startRefinement`**
- Add optional `onComplete` callback parameter to `startRefinement` and pass it through to `runRefinement`
- In `runRefinement`, after saving to DB successfully, call `onComplete(newHtml, parsedData, updatedChatHistory)` so the caller can update React state immediately
- This ensures the next vibe edit reads the latest HTML/data from state, not the stale pre-edit version

**4. `src/hooks/useDashboardEditor.ts` — Use `onComplete` to sync state**
- In `handleSendChat`, pass an `onComplete` callback to `startRefinement` that:
  - Calls `setDashboardHtml(newHtml)` with the refined HTML
  - Calls `setDashboardData(newData)` if structured data was parsed
  - Appends the assistant "updated" message to `chatHistory`
  - Saves a post-refinement revision and bumps the revision trigger
- This closes the loop: sequential vibe edits now always operate on the latest refined version

### Technical Detail

```text
Before (broken):
  Edit 1 → startRefinement(html_v1) → saves html_v2 to DB
  Edit 2 → startRefinement(html_v1) → saves html_v2' to DB  ← uses stale v1!

After (fixed):
  Edit 1 → startRefinement(html_v1, onComplete) → saves html_v2 → onComplete(html_v2)
           → setDashboardHtml(html_v2)
  Edit 2 → startRefinement(html_v2, onComplete) → saves html_v3 → onComplete(html_v3)  ✓
```

### Files to Change
- `src/components/DynamicMaterialsSection.tsx` — 1 label rename
- `src/components/HelpDrawer.tsx` — 3 text updates
- `src/lib/backgroundGenerator.ts` — add `onComplete` callback plumbing
- `src/hooks/useDashboardEditor.ts` — wire `onComplete` to update React state

