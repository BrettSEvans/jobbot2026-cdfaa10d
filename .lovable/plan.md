

## Add Revision History + Change Asset Feature

### Current State
- **Resume tab**: Saves revisions to `resume_revisions` table on regeneration, but **no UI to browse them**
- **Cover Letter tab**: Has `CoverLetterRevisions` component showing history with Preview/Download -- working
- **Dashboard tab**: Has `DashboardRevisions` component showing history -- working
- **Generated assets** (Materials tab): `generated_asset_revisions` table exists but **no UI** and **no code saving revisions**
- **Change Asset**: `proposed_assets` table stores JD-recommended assets. Generated ones go into `generated_assets`. No swap mechanism exists.

### What We're Building

**1. Resume Revision History UI**
- Create `src/components/ResumeRevisions.tsx` (modeled on `DashboardRevisions`)
- Fetches from `resume_revisions` table, shows collapsible history with Preview (swap iframe srcDoc) and Download buttons
- Add to Resume tab in `ApplicationDetail.tsx` below action buttons

**2. Generated Asset Revision History**
- Create `src/lib/api/generatedAssetRevisions.ts` with save/get/delete helpers
- Create `src/components/GeneratedAssetRevisions.tsx` (same pattern as DashboardRevisions but keyed to `asset_id`)
- In `DynamicMaterialsSection.tsx`: add revision history under each asset's action bar
- Save a revision before regeneration in the asset regenerate handler

**3. Auto-save Revisions on Regeneration**
- Resume: already saves before regen -- confirmed
- Cover Letter: verify it saves before regen (it does via `saveCoverLetterRevision`)
- Generated assets: add revision save before regeneration in `DynamicMaterialsSection.tsx`

**4. Change Asset (Swap) Feature**
- Add a "Change Asset" button on each generated asset tab (only when not downloaded/locked)
- Opens a dialog listing alternative materials from `proposed_assets` (where `selected = false`) plus a few new suggestions from the JD intelligence data, each with name + description
- On confirm: saves current asset as a revision, updates `generated_assets` row with new `asset_name`/`brief_description`, calls `generate-material` edge function, marks old `proposed_asset` as `selected = false` and new one as `selected = true`
- Total material count stays the same -- one swapped out

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/ResumeRevisions.tsx` | New -- resume revision history UI |
| `src/lib/api/resumeRevisions.ts` | New -- CRUD helpers for resume_revisions |
| `src/lib/api/generatedAssetRevisions.ts` | New -- CRUD helpers for generated_asset_revisions |
| `src/components/GeneratedAssetRevisions.tsx` | New -- asset revision history UI |
| `src/pages/ApplicationDetail.tsx` | Add ResumeRevisions component to Resume tab |
| `src/components/DynamicMaterialsSection.tsx` | Add revision history per asset + "Change Asset" button/dialog + save revision before regen |

### No database changes needed
All required tables (`resume_revisions`, `generated_asset_revisions`, `proposed_assets`) and RLS policies already exist.

