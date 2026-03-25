

## Plan: Rename "Refine with AI" to "Vibe Edit" and Fix Iterative Editing

### Problem 1: Label Rename
One dashboard button still says "Refine with AI" instead of "Vibe Edit". Help drawer also references old name.

### Problem 2: Iterative Vibe Edit Uses Stale Content
The dashboard vibe edit runs refinement in the background (`backgroundGenerator.startRefinement`). After it completes, the result is saved to the DB but the local React state (`dashboardHtml`) is **not** updated. When the user sends a second vibe edit before the 10-second polling refreshes, it edits the **original** dashboard, not the refined one.

### Changes

**1. `src/components/DynamicMaterialsSection.tsx`** (line 608)
- Change `"Refine with AI"` to `"Vibe Edit"` on the dashboard button

**2. `src/components/HelpDrawer.tsx`**
- Update help text references from "Refine with AI" to "Vibe Edit"

**3. `src/hooks/useDashboardEditor.ts` — Fix iterative dashboard editing**
- After calling `backgroundGenerator.startRefinement`, subscribe to job completion and update local `dashboardHtml` and `dashboardData` state from the DB when the refinement finishes
- This ensures the next vibe edit operates on the latest refined version

**4. `src/lib/backgroundGenerator.ts` — Add completion callback support**
- Add an `onComplete` callback option to `startRefinement` that fires with the new HTML/data after `runRefinement` saves to DB
- Alternatively, expose a `subscribe(appId, callback)` method so `useDashboardEditor` can listen for completion

**5. `src/components/DynamicMaterialsSection.tsx` — Fix asset vibe edit iteration**
- The `handleAssetVibeEdit` function receives `asset.html` from the render closure. After a successful edit, it updates `generatedAssets` state (line 529), so subsequent edits should use the updated HTML. However, the function is called with `asset.html` from the `.map()` render — need to verify the closure captures the latest state. If stale, switch to reading from a ref or the state directly by asset ID.

### Technical Approach
The simplest fix for the dashboard: add a completion callback to `startRefinement` that returns the final HTML and dashboard data. In `useDashboardEditor.handleSendChat`, use this callback to update `dashboardHtml`, `dashboardData`, and `chatHistory` state immediately upon completion, rather than waiting for the 10-second poll.

```text
User clicks "Vibe Edit" → handleSendChat
  ├─ Saves pre-edit revision
  ├─ Calls startRefinement(currentHtml, ..., onComplete)
  │     └─ Background: stream → parse → save to DB → onComplete(newHtml, newData)
  └─ onComplete updates React state (dashboardHtml, dashboardData, chatHistory)
       └─ Next vibe edit uses updated state ✓
```

