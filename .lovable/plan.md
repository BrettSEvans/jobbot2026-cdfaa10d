

## Plan: Default Bookmarked Stage, 48-Hour Prompt, and Declined Column

### 1. Add "declined" stage and change default to "bookmarked"

**File: `src/lib/pipelineStages.ts`**
- Add `'declined'` to `PIPELINE_STAGES` array after `'accepted'`
- Add label, color, and logical flow entries for `declined`
- Update `LOGICAL_FLOW` so `accepted` can flow to `declined`

**Database migration:**
- Change default value of `pipeline_stage` column from `'applied'` to `'bookmarked'`:
  ```sql
  ALTER TABLE public.job_applications ALTER COLUMN pipeline_stage SET DEFAULT 'bookmarked';
  ```

### 2. Update Kanban board for new stage

**File: `src/components/KanbanBoard.tsx`**
- Update `mainStages` filter to include `declined` (keep `rejected` separate or merge visually)
- The `columns` map already derives from `PIPELINE_STAGES` so adding `declined` there propagates automatically — just need to initialize the `declined` key in the `map` object

### 3. 48-hour "Have you applied?" prompt

**File: `src/pages/Applications.tsx`**
- When on the Applications page, check for any app in `bookmarked` stage where `stage_changed_at` is older than 48 hours
- Track dismissed prompts in `localStorage` keyed by application ID so each app is only prompted once
- Show a dismissable banner/toast with the company name and a "Update Status" button that navigates to the application detail page
- Only show one prompt at a time (pick the oldest bookmarked app that hasn't been dismissed)

### 4. Update help docs and tutorial

**File: `src/lib/helpEntries.ts`**
- Update `pipeline-kanban` entry to mention the `Declined` stage and the 48-hour prompt behavior

**File: `src/lib/tutorial/steps.ts`**
- Update the `pipeline-view` step body to include "Declined" in the stage list

### 5. Update test fixtures

**File: `src/test/maui/fixtures/index.ts`**
- Add `'declined'` to the `PIPELINE_STAGES` fixture if it's defined there

### Summary of changes

| File | Change |
|------|--------|
| DB migration | Change `pipeline_stage` default from `'applied'` to `'bookmarked'` |
| `src/lib/pipelineStages.ts` | Add `declined` stage; update labels, colors, logical flow |
| `src/components/KanbanBoard.tsx` | Add `declined` to columns map and main stages |
| `src/pages/Applications.tsx` | Add 48-hour bookmarked prompt with one-time dismiss per app |
| `src/lib/helpEntries.ts` | Document declined stage and 48-hour prompt |
| `src/lib/tutorial/steps.ts` | Update pipeline step body text |
| `src/test/maui/fixtures/index.ts` | Add `declined` to stage fixtures |

