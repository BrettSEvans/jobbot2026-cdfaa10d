## Plan: Fix Publish Visibility, Scope Edits to Active View, and Add Collapsible Sidebar Navigation

### Problem Summary

1. **Publish button hidden**: The `PublishDashboard` card is rendered *outside* the dashboard `TabsContent`, so it only shows when the dashboard tab is active AND `dashboardData` exists. But it's placed above the tabs content area and may be scrolled past or missed. More critically, when viewing the "Live Dashboard" mode, there are no publish/edit controls visible inline.
2. **Edits not scoped to active view**: The downloadable dashboard's Vibe Edit and Regenerate modify the app-level `dashboard_html`. The live dashboard's controls are buried in the `PublishDashboard` card. There's no clear separation — users expect the toolbar they see to affect the dashboard they're viewing.
3. **Navigation is a horizontal tab bar**: The live `DashboardRenderer` uses a top-bar horizontal nav. The downloadable version uses a collapsible sidebar with hamburger toggle. The live dashboard should match.  
4 . Remove the sync from app button  
5.  table font/background color contrast is makes the text unreadable .  contrast needs to be increased

### Changes

#### 1. Move Publish Controls Into the Live Dashboard View (`DynamicMaterialsSection.tsx`)

- Move the `PublishDashboard` component from its current position (line ~659, outside TabsContent) into the **Live Dashboard view** section (line ~808).
- When in "live" mode, show the publish card + vibe edit + regenerate controls inline above the renderer.
- When in "download" mode, hide publish controls entirely (they don't apply).

#### 2. Scope Vibe Edit / Regenerate to Active View (`DynamicMaterialsSection.tsx`)

- "Download" mode toolbar: Vibe Edit and Regenerate modify `dashboard_html` on the `job_applications` record (existing behavior, unchanged).
- "Live" mode toolbar: Vibe Edit and Regenerate modify `dashboard_data` on the `live_dashboards` record (handled by `PublishDashboard` component, already correct).
- No cross-contamination — each mode's controls only touch their own data source.

#### 3. Replace Top Nav with Collapsible Sidebar (`DashboardRenderer.tsx`)

Rewrite the navigation from a horizontal tab bar in the header to a sidebar layout matching the downloadable version:

- **Sidebar** (280px, left): company logo area at top, vertical nav items below, collapsible via hamburger button.
- **Hamburger button** in the top bar toggles sidebar open/closed.
- On mobile: sidebar starts collapsed, overlays content when opened.
- On desktop: sidebar starts expanded, pushes content.
- Active nav item highlighted with primary color.
- Same `activeNav` state drives section filtering (no logic change).
- Style with the existing branding CSS custom properties (`--dash-primary`, `--dash-surface-variant`, etc.).  
  
4. remove sync from app button  
  
5. increase contrast in tables.

### Files Changed


| File                                                  | Change                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/components/DynamicMaterialsSection.tsx`          | Move `PublishDashboard` into the live view section; remove it from the global position above tabs          |
| `src/components/live-dashboard/DashboardRenderer.tsx` | Replace horizontal nav with collapsible sidebar + hamburger toggle, matching downloadable dashboard layout |


### What stays the same

- `PublishDashboard.tsx` — no changes needed, its vibe edit/regenerate already targets `live_dashboards`
- Downloadable dashboard toolbar — unchanged
- Schema, edge functions, database — no changes
- `LiveDashboard.tsx` (public page) — gets the sidebar automatically via `DashboardRenderer`