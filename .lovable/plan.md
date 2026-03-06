

## Plan: Pipeline Tab, Labeled Toggle, Contextual Nudge + Help/Tutorial Updates

### 1. Replace icon-only toggle with labeled "Applications" / "Pipeline" tab bar

**File: `src/pages/Applications.tsx`**
- Replace the `ToggleGroup` (lines 288-295) with a proper labeled segmented control using two buttons styled as a toggle: `[ List | Pipeline ]` with text labels and icons.
- Move this toggle to sit prominently below the page header or inline with the existing `Applications / Trash` tabs.

**Better approach**: Add "Pipeline" as a third tab alongside "Applications" and "Trash" in the existing `<Tabs>` component (line 369-380). This makes it a first-class view:
  - `Applications` tab → list view (current)
  - `Pipeline` tab → Kanban board
  - `Trash` tab → deleted items
- Remove the separate `ToggleGroup` and `viewMode` state; use the existing `activeView` state with values `"active" | "pipeline" | "trash"`.
- Add `data-tutorial="pipeline-tab"` to the Pipeline trigger for tutorial targeting.

### 2. Contextual nudge on ApplicationDetail page

**File: `src/pages/ApplicationDetail.tsx`**
- Near the pipeline stage `<Select>` dropdown (line 242), add a subtle link: *"View all stages →"* that navigates to `/?view=pipeline` (or `/applications?view=pipeline`).
- On the Applications page, check for a `view=pipeline` URL param and auto-switch to the Pipeline tab if present.

### 3. Update help entries

**File: `src/lib/helpEntries.ts`**
- Update the `applications-list` help entry to mention the Pipeline tab and Kanban board view.
- Add a new help entry with slug `pipeline-kanban`:
  - Title: "Pipeline (Kanban Board)"
  - Summary: Drag-and-drop board showing applications organized by stage.
  - Steps: how to access, how to drag between columns, illogical transition warnings.
  - Route: `/` (same page, different tab)
  - Keywords: pipeline, kanban, board, stages, drag, drop

### 4. Update tutorial steps

**File: `src/lib/tutorial/steps.ts`**
- Add a new tutorial step targeting `[data-tutorial="pipeline-tab"]`:
  - id: `"pipeline-view"`
  - title: "Pipeline View"
  - body: "Switch to Pipeline view to see all your applications organized by stage — Bookmarked, Applied, Interviewing, Offer, Accepted. Drag and drop cards between columns to update their status."
  - placement: "bottom"
  - route: "/"
  - order: 2.5 (between "welcome" at 1 and "new-app" at 2 → adjust: welcome=1, pipeline=2, new-app=3, shift all subsequent orders +1)
  - helpSlug: `"pipeline-kanban"`

- Add a tutorial step for the contextual nudge on the detail page:
  - id: `"pipeline-nudge"`
  - targetSelector: `'[data-tutorial="pipeline-link"]'`
  - title: "View Full Pipeline"
  - body: "Click here to see all your applications organized by stage in the Pipeline board."
  - route: "/applications/:id"
  - order: insert after the stage dropdown context (around order 5-6)
  - helpSlug: `"pipeline-kanban"`

### 5. Summary of file changes

| File | Change |
|------|--------|
| `src/pages/Applications.tsx` | Replace ToggleGroup with Pipeline tab in TabsList; remove viewMode state; handle `?view=pipeline` URL param |
| `src/pages/ApplicationDetail.tsx` | Add "View all stages →" link next to pipeline stage Select |
| `src/lib/helpEntries.ts` | Update `applications-list` entry; add `pipeline-kanban` entry |
| `src/lib/tutorial/steps.ts` | Add `pipeline-view` step; add `pipeline-nudge` step; adjust ordering |

