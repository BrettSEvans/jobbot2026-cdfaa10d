## Plan: Functional Global Filters + Branded Interactive Popup

### Problem 1: Filters are not functional

The global filter bar renders correctly but has limited effect:

- **Tables are never filtered** — `applyGlobalFilters()` only iterates `sectionCharts`, which contains Chart.js instances. Tables are not registered anywhere, so filters have zero effect on table data.
- **Heatmap, funnel, waterfall, gantt renderers** don't register entries in `sectionCharts`, so they are also invisible to both cross-chart and global filtering.
- When "All" is selected, the reset logic works, but partial matches use `indexOf` which can produce false positives (e.g., "NA" matching "BANANA").

### Problem 2: Interactive popup not branded

The "Your dashboard is interactive!" overlay (in `DynamicMaterialsSection.tsx` line 698-713) uses generic styling. It should show the dashboard compay logo and brand identity of the job being applied to .

---

### Changes

#### File 1: `src/lib/dashboard/templates/scripts.ts`

**A. Register tables in a parallel tracking structure**

- Create a `sectionTables` registry (similar to `sectionCharts`).
- In `renderTable()`, store a reference to each table's `tbody`, its `rows` data, `columns` config, and the section ID.
- Each row gets a `data-labels` attribute containing all cell values (pipe-delimited) for filter matching.

**B. Make `applyGlobalFilters()` also filter tables**

- After filtering charts, iterate `sectionTables` entries.
- For each table row, check if any cell value contains any active filter value. Hide non-matching rows (`display:none`). Update the record count in the table header.
- Use word-boundary-aware matching (exact option match or the value equals/starts the cell text) to avoid false positives.

**C. Register heatmap/funnel/waterfall/gantt in `sectionCharts**`

- For heatmap: store the card element, labels, and a custom `applyFilter` callback that dims non-matching rows.
- For funnel: store the card and labels, with a callback that dims non-matching bars.
- Waterfall and gantt already use Chart.js canvases but don't register — add registration after creating the Chart instance.

**D. Table column-level filter controls (page-level)**

- Add a small filter icon to each sortable table header.
- Clicking it shows a dropdown of unique values in that column.
- Selecting a value filters the table rows to only show matches. This is a per-table, per-column filter independent of global filters.

#### File 2: `src/components/DynamicMaterialsSection.tsx`

**Brand the interactive popup:**

- Import `BrandLogo` component.
- Replace the generic `Sparkles` icon with `<BrandLogo showWordmark={false} iconSize="2.4em" />`.
- Add the brand name in the heading: "Your  dashboard is interactive!" (using the BRAND constant).
- Style the popup card border with `border-primary/30` for brand accent.
- Update the dismiss button text to "Got it — let me explore!" (already correct, keep it).

---

### Files to change


| File                                         | What                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/dashboard/templates/scripts.ts`     | Register tables + heatmap/funnel/waterfall/gantt for filtering; extend `applyGlobalFilters` to filter tables; add per-column table filters |
| `src/lib/dashboard/templates/styles.ts`      | CSS for table column filter dropdowns, hidden rows                                                                                         |
| `src/components/DynamicMaterialsSection.tsx` | Brand the interactive welcome popup with BrandLogo and BRAND name                                                                          |
