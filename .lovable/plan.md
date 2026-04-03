

## Plan: Replace Global Filters with Chart-Click Cross-Filtering

### Summary
Remove the header filter bar. Instead, clicking a chart segment (bar, pie slice, etc.) sets a drill-down filter that cross-filters all sibling charts and tables within the same tab view. Multiple chart clicks combine with AND logic. Active filters display as dismissible pills above the filtered content.

### Architecture

```text
DashboardRenderer
  ├── drillFilters state: Map<chartId, { field: string, value: string }>
  ├── ActiveFilterPills (shows pills with ✕ to remove)
  ├── SectionBlock
  │     ├── ChartBlock (onClick → toggle drill filter)
  │     └── DataTable (receives combined drill filters)
```

### Changes

#### 1. Remove global FilterBar (`DashboardRenderer.tsx`)
- Delete the `FilterBar` import and its rendering block (lines 394-397)
- Remove `filterValues` state and `handleFilterChange` handler
- Add new `drillFilters` state: `Record<string, { field: string; value: string }>` keyed by `chartId`
- Add `toggleDrillFilter(chartId, field, value)` function that adds or removes a filter entry
- Compute `activeDrillValues` from drillFilters for passing to charts and tables

#### 2. New `ActiveFilterPills` component (inline in `DashboardRenderer.tsx`)
- Renders above sections when any drill filters are active
- Each pill shows the filter value with an ✕ button
- Styled with dashboard branding colors (`primaryContainer`/`onPrimaryContainer`)
- Clicking ✕ removes that specific filter; "Clear all" link clears everything

#### 3. Make charts clickable (`ChartBlock.tsx`)
- Accept new prop: `onDrillDown: (chartId: string, field: string, value: string) => void`
- Accept new prop: `activeDrillValues: Record<string, { field: string; value: string }>`
- For **bar/horizontalBar/line/area**: add `onClick` handler to Recharts `Bar`/`Line`/`Area` that extracts the clicked label (`name`) and calls `onDrillDown`
- For **pie/doughnut**: add `onClick` on `Pie` component; extract `name` from payload
- For **funnel**: add `onClick` on `Funnel`
- Highlight the active/selected segment visually (increased opacity or stroke) based on `activeDrillValues`
- Add `cursor: pointer` styling to clickable chart elements

#### 4. Update DataTable filtering (`DataTable.tsx`)
- Change `filterValues` prop type from `Record<string, string>` to accept the new drill filter format: `Array<{ field: string; value: string }>`
- Filter rows where ANY column value matches ALL active filter values (AND logic across filters)
- Display active filter pills inline in the table header area

#### 5. Wire it all together (`DashboardRenderer.tsx` → `SectionBlock`)
- Pass `onDrillDown` and `activeDrillValues` through `SectionBlock` to both `ChartBlock` and `DataTable`
- Clear drill filters on nav tab change (reset when `activeNav` changes)

### Files Changed

| File | Change |
|---|---|
| `src/components/live-dashboard/DashboardRenderer.tsx` | Remove FilterBar; add drillFilters state, ActiveFilterPills, pass drill props to SectionBlock |
| `src/components/live-dashboard/ChartBlock.tsx` | Add onClick handlers to all chart types; accept onDrillDown + activeDrillValues props; highlight selected segments |
| `src/components/live-dashboard/DataTable.tsx` | Update filtering to use drill filter array with AND logic; show filter pills in table header |
| `src/components/live-dashboard/FilterBar.tsx` | No changes (remains available but unused by live renderer) |

### What stays the same
- Schema (`schema.ts`) — no changes; `globalFilters` stays optional
- Edge functions — no changes
- Database — no changes
- CFO scenarios and agentic workforce sections — unaffected

