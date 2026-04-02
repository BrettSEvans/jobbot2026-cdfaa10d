

## Plan: Live React Dashboards Within ResuVibe (Admin Only)

### Overview
Build a native React dashboard renderer hosted within ResuVibe at public URLs (`/d/:username/:company/:jobtitle`). Visitors see interactive dashboards with Recharts, scenario sliders, and an AI chatbot — no login required to **view**. Only **admin** users can publish/manage live dashboards.

### Architecture

```text
Current:  AI → DashboardData JSON → HTML assembler → iframe preview + ZIP download
New:      AI → DashboardData JSON → stored in live_dashboards table →
          Public route /d/:username/:company/:jobtitle →
          Native React renderer (Recharts, filters, scenarios, AI chat)
```

### 1. Database — `live_dashboards` table

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| application_id | uuid | FK to job_applications |
| user_id | uuid | Owner (admin who published) |
| slug_username | text | URL segment |
| slug_company | text | URL segment |
| slug_jobtitle | text | URL segment |
| dashboard_data | jsonb | The DashboardData JSON |
| is_published | boolean | Toggle visibility |
| chatbot_enabled | boolean | Enable AI chat for visitors |
| created_at / updated_at | timestamps | |

Unique constraint on `(slug_username, slug_company, slug_jobtitle)`.

**RLS policies:**
- **Public SELECT**: `anon` and `authenticated` can SELECT where `is_published = true`
- **Admin CRUD**: Only users with admin role can INSERT/UPDATE/DELETE (via `has_role(auth.uid(), 'admin')`)

### 2. Public route (no auth)

Add `/d/:username/:company/:jobtitle` **outside** `AuthenticatedApp` in `App.tsx` so it renders without login.

### 3. New components

| Component | Purpose |
|---|---|
| `src/pages/LiveDashboard.tsx` | Public page — fetches by slug, renders dashboard or 404 |
| `src/components/live-dashboard/DashboardRenderer.tsx` | Converts `DashboardData` JSON → native React: KPI cards, sections, navigation |
| `src/components/live-dashboard/ChartBlock.tsx` | Renders all chart types via Recharts (bar, line, radar, area, funnel, etc.) |
| `src/components/live-dashboard/ScenarioPanel.tsx` | Interactive CFO scenarios — sliders/toggles that update charts in real time |
| `src/components/live-dashboard/FilterBar.tsx` | Global cross-filter bar (dropdowns, chips, segmented) |
| `src/components/live-dashboard/DashboardChatbot.tsx` | Embedded AI chat panel for visitors to query dashboard data |

### 4. Publish flow (admin only)

Add a "Publish Live Dashboard" button on the Materials/Dashboard tab in `ApplicationDetail.tsx`. This button:
- Is **only visible to admin users** (check `user_roles` for admin role)
- Generates URL slugs from profile display_name, company name, and job title
- Upserts into `live_dashboards` with current `dashboard_data`
- Shows the shareable public URL
- Toggle for chatbot enable/disable

### 5. Edge function — `dashboard-chat`

- Receives visitor question + dashboard's `DashboardData` as context
- Uses `getModel('standard')` for responses
- No auth required (serves public dashboards)
- Rate-limited by IP to prevent abuse

### 6. Router update — `App.tsx`

```text
<BrowserRouter>
  <Routes>
    <Route path="/d/:username/:company/:jobtitle" element={<LiveDashboard />} />
  </Routes>
  <ErrorBoundary>
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  </ErrorBoundary>
</BrowserRouter>
```

The `/d/` route sits outside AuthProvider so it loads without authentication.

### Implementation order

1. DB migration for `live_dashboards` with admin-only write + public read RLS
2. `DashboardRenderer` + `ChartBlock` + `ScenarioPanel` component tree
3. `LiveDashboard` public page + router registration
4. Publish flow UI (admin-gated) on ApplicationDetail
5. `FilterBar` for cross-filtering
6. `dashboard-chat` edge function + `DashboardChatbot` component

### What stays the same
- Existing downloadable ZIP workflow (untouched)
- Dashboard generation via `generate-dashboard` (same AI, same JSON)
- iframe preview on Dashboard tab (kept alongside Publish button)
- All existing `DashboardData` schema — React renderer reads the same JSON

### Admin restriction summary
- Publishing, unpublishing, and managing live dashboards: **admin only** (RLS + UI gating)
- Viewing published dashboards at `/d/` URLs: **public, no login**

