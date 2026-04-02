

## Plan: Dashboard Feature Improvements (Priority Order)

### 1. Apply Company Branding
**File:** `DashboardRenderer.tsx`
- Read `data.branding` and apply as CSS custom properties on the root div
- Use `branding.primary` for header background, nav active states, chatbot accent
- Apply `branding.fontHeading` and `branding.fontBody` via Google Fonts dynamic import
- Cards use `branding.surface`/`branding.onSurface`, borders use `branding.outline`

### 2. Make Navigation Functional
**File:** `DashboardRenderer.tsx`
- Map each `NavItem.id` to section IDs (match by prefix or explicit mapping)
- When a nav tab is active, only render sections whose `id` starts with or matches the nav item
- If no nav items exist, render all sections (current behavior)

### 3. Wire Up Global Filters
**Files:** `DashboardRenderer.tsx`, `ChartBlock.tsx`, `DataTable.tsx`
- Pass `filterValues` down to `SectionBlock` → `ChartBlock` / `DataTable`
- In `DataTable`: filter rows by matching filter key/value pairs
- In `ChartBlock`: filter datasets or data points by matching filter labels
- Show active filter count badge on FilterBar

### 4. Add Candidate Hero Section
**File:** `DashboardRenderer.tsx` (new `CandidateHero` sub-component)
- Add optional `candidate` field to `DashboardData` schema (name, photo URL, tagline, LinkedIn, portfolio links)
- Render a professional hero banner above sections with candidate info
- If no candidate data, show a clean company-branded header only

### 5. Implement Missing Chart Types
**File:** `ChartBlock.tsx`
- **Waterfall**: Stacked bar with invisible base segments + colored positive/negative bars
- **Gantt**: Horizontal bars with start/end positions on time axis
- **Heatmap**: Grid of colored cells using a custom SVG component
- **Treemap**: Use Recharts' `Treemap` component

### 6. Add Chatbot Suggested Questions
**File:** `DashboardChatbot.tsx`
- Generate 3-4 starter prompts from dashboard data (e.g., "What are the top KPIs?", "Explain the revenue scenario")
- Render as clickable chips in the empty state
- On click, populate input and auto-send

### 7. Mobile Optimization
**Files:** `DashboardRenderer.tsx`, `DashboardChatbot.tsx`
- Collapse nav into a horizontal scroll with smaller touch targets
- FilterBar: stack vertically on mobile
- Chatbot: full-screen sheet on mobile instead of fixed card
- Reduce header padding, use collapsible sections

### 8. Configurable Footer
**File:** `DashboardRenderer.tsx`
- Add optional `footer` field to schema with custom text/links
- Default: subtle "Powered by ResuVibe" — can be overridden or hidden

### Implementation Order
1. Branding (highest visual impact, makes every dashboard unique)
2. Navigation + Filters (fixes the two most obvious broken features)
3. Candidate Hero (answers "who made this" for hiring managers)
4. Chatbot suggested questions (low effort, high engagement lift)
5. Missing chart types (fixes the "fake chart" problem)
6. Mobile + Footer (polish)

### Schema Changes
Add to `DashboardData` in `src/lib/dashboard/schema.ts`:
```typescript
candidate?: {
  name: string;
  photoUrl?: string;
  tagline: string;
  linkedIn?: string;
  portfolio?: string;
};
footer?: {
  text?: string;
  showBranding?: boolean;
};
```

### Files Changed
| File | Change |
|---|---|
| `src/lib/dashboard/schema.ts` | Add `candidate`, `footer` types |
| `src/components/live-dashboard/DashboardRenderer.tsx` | Branding, navigation filtering, hero, footer |
| `src/components/live-dashboard/ChartBlock.tsx` | Waterfall, gantt, heatmap, treemap implementations |
| `src/components/live-dashboard/DataTable.tsx` | Filter integration |
| `src/components/live-dashboard/DashboardChatbot.tsx` | Suggested questions, mobile sheet |

### What stays the same
- Existing downloadable ZIP workflow untouched
- `live_dashboards` table schema unchanged
- Admin-only publish flow unchanged
- `dashboard-chat` edge function unchanged
- No database migrations needed

