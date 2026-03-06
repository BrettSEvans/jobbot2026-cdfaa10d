

## Plan: Update Pipeline Stages, Add Ghosted/Withdrawn, and Ghost Prompt

### 1. Update pipeline stage definitions

**File: `src/lib/pipelineStages.ts`**

New `PIPELINE_STAGES` array (renamed from "Bookmarked" to "Created" in labels):
```
bookmarked, applied, interviewing, offer, accepted, withdrawn, ghosted, rejected
```

- Rename label: `bookmarked` → "Created"
- Remove `declined` entirely
- Add `withdrawn` (after accepted) with orange styling
- Add `ghosted` (after withdrawn) with a muted purple/gray styling
- Update `LOGICAL_FLOW`:
  - `applied` → `['interviewing', 'ghosted', 'rejected']`
  - `interviewing` → `['offer', 'ghosted', 'rejected']`
  - `offer` → `['accepted', 'withdrawn', 'rejected']`
  - `accepted` → `['withdrawn']`
  - `withdrawn` → `[]`
  - `ghosted` → `[]`

**Database migration:**
```sql
-- Update any existing 'declined' records to 'withdrawn'
UPDATE public.job_applications SET pipeline_stage = 'withdrawn' WHERE pipeline_stage = 'declined';
UPDATE public.pipeline_stage_history SET from_stage = 'withdrawn' WHERE from_stage = 'declined';
UPDATE public.pipeline_stage_history SET to_stage = 'withdrawn' WHERE to_stage = 'declined';
```

### 2. Update Kanban board columns

**File: `src/components/KanbanBoard.tsx`**
- `mainStages` filter: show all stages except `rejected` as main columns (withdrawn, ghosted included)
- The rejected column remains conditionally visible at the end

### 3. Two-week "Ghost" prompt (lonely ghost vibe)

**File: `src/pages/Applications.tsx`**
- Add a second `useMemo` check: apps in `applied` stage for 14+ days, tracked via `localStorage` key `dismissed_ghost_prompts`
- Show a dialog/card with lonely ghost theming:
  - Ghost emoji or illustration
  - Melancholy but light copy like "It's been 2 weeks... Did they ghost you?"
  - Subdued purple/gray palette
  - Two buttons: "Mark as Ghosted" (moves to ghosted stage) and "Not yet" (dismisses)
  - One-time per application

**I will first implement the stage changes and the ghost prompt UI, then present the ghost popup design for your approval before finalizing.**

### 4. Update test fixtures

**File: `src/test/maui/fixtures/index.ts`**
- Replace `declined` with `withdrawn`, add `ghosted` to `PIPELINE_STAGES`

### 5. Update help/tutorial references

**Files: `src/lib/helpEntries.ts`, `src/lib/tutorial/steps.ts`**
- Update stage lists to reflect new names

### Summary

| File | Change |
|------|--------|
| DB migration | Rename `declined` → `withdrawn` in existing data |
| `src/lib/pipelineStages.ts` | New stage order, add withdrawn/ghosted, remove declined, rename bookmarked label to "Created" |
| `src/components/KanbanBoard.tsx` | Include withdrawn/ghosted in main columns |
| `src/pages/Applications.tsx` | Add 14-day ghost prompt with lonely ghost UI |
| `src/test/maui/fixtures/index.ts` | Update fixture stages |
| `src/lib/helpEntries.ts` | Update stage references |
| `src/lib/tutorial/steps.ts` | Update stage references |

