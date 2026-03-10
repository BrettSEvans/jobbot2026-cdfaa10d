# Plan: Design Variability Scoring + ATS Score Persistence

## Part 1: ATS Score Persistence Fix

**File: `src/pages/ApplicationDetail.tsx**`

The auto-trigger effect (lines 96-107) fires whenever `prevResumeHtmlRef` starts empty and `resumeHtml` loads from DB — effectively re-scanning on every page load. Fix: import `isCacheValid` and check before triggering.

- Import `isCacheValid` from `@/lib/api/atsScore`
- In the auto-trigger effect, add a guard: if `state.app?.ats_score` exists and `isCacheValid(cachedScore, state.app.ats_scored_at, currentHtml, state.jobDescription)` is true, skip the scan
- This ensures ATS only re-runs when resume HTML or JD actually changes content (hash mismatch), not on page reload

---

## Part 2: Design Variability Scoring (Admin-Only)

### Concept

AI analyzes the structural HTML patterns of all generated dynamic assets within an application. Evaluates layout diversity (headers, tables, charts, timelines, grids), branding consistency (company colors/fonts applied), and whether each document tells a visually distinct story. The Brett Evans / ResuVibe application should score low on variability since assets share identical header + bold paragraph + grey/yellow block patterns, but score a  bit better on chart/table variety.

### Database Migration

Add `design_variability` (jsonb, nullable) column to `job_applications` table.

### Edge Function: `supabase/functions/score-design-variability/index.ts`

- Accepts `{ assets: [{assetName, html}], branding: {...} }` + auth token
- Admin-only check via service role + `has_role`
- Strips text content, extracts structural patterns (tag hierarchy, CSS classes, layout containers)
- Calls Lovable AI (`google/gemini-3-flash-preview`) with tool calling to return structured output:
  - `overallScore` (0-100, higher = more variety)
  - `brandingScore` (0-100, how well assets match company branding)
  - `pairwiseScores` (`[{asset1, asset2, similarity: 0-100}]`)
  - `structuralPatterns` (`[{assetName, dominantPattern: string}]`)
  - `recommendations` (string[])
- Persists result to `design_variability` column

### API Helper: `src/lib/api/designVariability.ts`

- `scoreDesignVariability(appId, assets, branding)` — invokes edge function, returns result
- `getCachedVariability(app)` — reads from `app.design_variability`

### UI Component: `src/components/admin/DesignVariabilityCard.tsx`

- Admin-only card (gated by `useUserRoles().isAdmin`)
- Shows overall variability % with color coding (red < 40, yellow 40-70, green > 70)
- Branding alignment score
- Recharts `BarChart` showing pairwise similarity between asset pairs
- Structural pattern description per asset
- Recommendations list
- "Analyze Variability" button to trigger/refresh

### Integration: `src/pages/ApplicationDetail.tsx`

- Import `useUserRoles` and `DesignVariabilityCard`
- Render above the Industry Materials grid, conditionally: `isAdmin && dynamicAssets.length >= 2`
- Pass `dynamicAssets`, `app.branding`, `app.design_variability`, and `appId`

### Config

- Add `score-design-variability` to `supabase/config.toml` with `verify_jwt = false`