## UX/UI Review: Live Dashboard Improvements

Based on the Pencil & Paper and Think Design guidelines, here are the gaps and recommended improvements.

---

### Current Gaps Identified

1. **No visual hierarchy for KPIs** -- All KPI cards are the same size and style. The articles recommend making the most critical metrics larger/bolder ("big fancy numbers") and placing them top-left per F/Z scanning patterns.
2. **No empty states on charts/tables** -- If a section has zero data, nothing renders. Both articles stress loading feedback and empty states.
3. **No data labels on charts by default** -- Charts rely entirely on hover tooltips. The articles recommend showing key data values directly on charts to reduce interaction cost.
4. **No legend toggling** -- Users cannot hide/show dataset lines in multi-series charts. Pencil & Paper specifically recommends making legend items clickable toggles.
5. **Color accessibility** -- Charts use a fixed COLORS palette without patterns/textures. The article warns against relying on color alone and recommends hashes, dashes, and textures.
6. **No section descriptions/context cards** -- Section descriptions are plain dim text. The articles recommend orienting users with clear page purpose statements and grouped context.
7. **No loading skeleton** -- The dashboard shows a single spinner. Both articles recommend skeleton/shimmer loading states that hint at the page structure.
8. **Tables lack sorting** -- DataTable has no column sort. Both articles recommend sortable columns as a baseline interaction.
9. **Mobile experience is basic** -- Charts don't adapt for mobile (same 320px height). The Pencil & Paper article suggests vertical chart layouts or "better on larger screen" hints for complex charts.
10. **No breadcrumb or page context indicator** -- When navigating tabs, there's no persistent indicator of where you are beyond the sidebar highlight.
11. **KPI delta context is missing** -- KPI cards show a change value but no comparison period (e.g., "vs last quarter"). The articles recommend explicit delta labels.
12. **No export/share capability** -- The Medium article lists export (PDF, CSV, image) and sharing as essential dashboard features.

---

### Implementation Plan

#### 1. KPI visual hierarchy -- spotlight card for primary metric

- In `KpiCard.tsx`, add a `spotlight` prop that renders the card 2x wider with larger font (text-4xl), bolder value, and a subtle background gradient using branding primary color.
- In `DashboardRenderer.tsx` `SectionBlock`, when layout is `kpi-spotlight` or section is the overview, render the first metric as a spotlight card and the rest as standard cards.

#### 2. Empty states for sections with no data

- In `SectionBlock`, if a section has no metrics, no charts, and no tables, render a centered empty-state card with an icon and "No data available for this section" message.
- In `DataTable`, if `filteredRows` is empty, show "No matching records" with a muted icon instead of an empty table body.

#### 3. Data labels on bar and pie charts

- In `ChartBlock.tsx`, add `<LabelList>` to bar charts showing values on top of bars.
- For pie/doughnut, add value labels on slices using the `label` prop with a custom render function showing percentage.

#### 4. Clickable legend toggling for line/area charts

- In `ChartBlock.tsx`, for line and area chart types, track hidden datasets in local state. On legend click, toggle visibility of that dataset. Use Recharts' `onClick` on `<Legend>` to toggle series.

#### 5. Accessible color patterns

- Add `strokeDasharray` patterns to line chart datasets (solid, dashed, dotted) so lines are distinguishable without color.
- For bar charts, alternate between solid fills and subtle stripe patterns using SVG `<pattern>` definitions.

#### 6. Section context cards

- Update the section header in `SectionBlock` to render the description inside a lightly styled card (surface-variant background, left border accent) instead of plain dim text, making it a proper orientation block.

#### 7. Skeleton loading state

- Create a `DashboardSkeleton.tsx` component with placeholder bars for header, KPI cards, and chart areas using the existing `Skeleton` UI component.
- Use it in `LiveDashboard.tsx` instead of the single `Loader2` spinner.

#### 8. Sortable table columns

- In `DataTable.tsx`, add `sortColumn` and `sortDirection` state. Clicking a column header sorts the rows. Show a small arrow indicator on the active sort column.



#### 10. Active tab breadcrumb

- Below the header in `DashboardRenderer.tsx`, add a slim breadcrumb bar showing `{companyName} > {activeNavLabel}` to orient the user, styled with surface-variant background.

#### 11. Delta comparison labels on KPIs

- Update the generation prompt in `generate-dashboard/index.ts` to instruct the LLM to include a comparison period in the `change` field (e.g., "+12% vs Q3" not just "+12%").
- No renderer changes needed -- the existing `change` string will carry the context.



---

### Files to modify


| File                                                  | Change                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/components/live-dashboard/KpiCard.tsx`           | Add spotlight variant, larger typography                                                                  |
| `src/components/live-dashboard/ChartBlock.tsx`        | Data labels, legend toggling, line dash patterns, mobile height                                           |
| `src/components/live-dashboard/DataTable.tsx`         | Sortable columns, empty state                                                                             |
| `src/components/live-dashboard/DashboardRenderer.tsx` | Breadcrumb bar, section context cards, empty states, export button, skeleton loading, mobile chart banner |
| `src/components/live-dashboard/DashboardSkeleton.tsx` | New file -- loading skeleton                                                                              |
| `src/pages/LiveDashboard.tsx`                         | Use skeleton instead of spinner                                                                           |
| `supabase/functions/generate-dashboard/index.ts`      | Delta comparison labels in prompt                                                                         |
