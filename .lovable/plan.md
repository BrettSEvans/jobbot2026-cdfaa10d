

## Plan: Fix Dashboard Data Sync Between Preview and Public URL

### Root Cause

There are **three separate queries** fetching from the same `live_dashboards` table, each with different query keys and none properly invalidating each other:

1. `["live-dashboard-admin", applicationId]` — used by `PublishDashboard.tsx` for its internal state
2. `["live-dashboard-view", applicationId]` — used by `DynamicMaterialsSection.tsx` for the preview pane
3. `["live-dashboard", username, company, jobtitle]` — used by `LiveDashboard.tsx` (public URL page)

When a vibe edit or regenerate completes, only query #1 is invalidated. Queries #2 and #3 keep showing stale data. Additionally, `onPreviewLiveData` is defined as a prop on `PublishDashboard` but is **never passed** from `DynamicMaterialsSection`, so live edits cannot push updated data to the preview renderer.

### Changes

#### 1. Consolidate query invalidation (`PublishDashboard.tsx`)

After every mutation (publish, vibe edit, regenerate, toggle), invalidate ALL three query keys:
- `["live-dashboard-admin", applicationId]`
- `["live-dashboard-view", applicationId]`
- `["live-dashboard", ...]` (broad prefix invalidation)

This ensures the preview pane and public page both refetch fresh data after any change.

#### 2. Wire up `onPreviewLiveData` (`DynamicMaterialsSection.tsx`)

Pass a callback to `PublishDashboard` so that vibe edits and regenerations immediately update the preview renderer's data without waiting for a refetch. Add state for `liveDashPreviewData` and pass it to `DashboardRenderer`.

#### 3. Remove duplicate admin query

`PublishDashboard` has its own `liveDash` query (`["live-dashboard-admin"]`) that duplicates the `liveDashRecord` query in `DynamicMaterialsSection`. Pass `liveDashRecord` as a prop instead to ensure both components always reference the same data.

### Files Changed

| File | Change |
|---|---|
| `src/components/live-dashboard/PublishDashboard.tsx` | Broaden `queryClient.invalidateQueries` to cover all live-dashboard query keys; accept `liveDashRecord` as optional prop |
| `src/components/DynamicMaterialsSection.tsx` | Pass `onPreviewLiveData` callback and `liveDashRecord` to `PublishDashboard`; use callback data for immediate preview updates |

### What stays the same
- `LiveDashboard.tsx` — no code changes needed; query invalidation + refetch will handle sync
- Database schema — no changes
- Edge functions — no changes

