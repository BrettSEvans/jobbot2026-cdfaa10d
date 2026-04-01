

## Plan: Dashboard Variability — Layout Diversity, New Chart Types, and Cross-Page Controls

### Problem
Every dashboard section follows the same pattern: 3-5 metric cards → 2 charts side-by-side → 1 data table. Chart types cluster around bar/line/doughnut. This makes the dashboard feel repetitive and undermines the "storytelling breadth" the user wants to demonstrate.

### What Changes

#### 1. New Section Layout Modes (rendering engine)
Add a `layout` field to `DashboardSection` in the schema. The rendering engine (`scripts.ts`) will read it and arrange content differently per section:

- **`default`** — current: metrics → charts-grid → table (keep for 1-2 sections)
- **`kpi-spotlight`** — one large hero metric card with sparkline, flanked by smaller metrics. No table.
- **`split-panel`** — 60/40 two-column: left has a single large chart, right has stacked metric cards + mini chart
- **`full-width-timeline`** — a single horizontalBar/Gantt chart spanning full width, with metrics above
- **`grid-cards`** — metrics rendered as a 3×2 card grid with embedded mini-charts (no separate chart section)
- **`map-table`** — geographic heat map (Chart.js choropleth plugin or a styled HTML table-based heat map) + data table side by side

Each section in the LLM prompt will be instructed to pick a layout that fits its data type. The engine enforces that no two adjacent sections use the same layout.

#### 2. New Chart Types
Extend the chart rendering in `scripts.ts` to support:

- **`gantt`** — rendered as a horizontal stacked bar with task/milestone labels (using `horizontalBar` with stacked datasets and time-formatted labels)
- **`heatmap`** — rendered as an HTML grid of colored cells (no Chart.js needed) with a legend. Good for region × quarter or product × metric matrices.
- **`treemap`** — rendered using Chart.js treemap plugin (already compatible) for hierarchical data like budget allocation or market segments
- **`waterfall`** — rendered as a bar chart with floating bars showing incremental contributions (revenue build-up, cost breakdown)
- **`funnel`** — rendered as stacked horizontal bars with decreasing widths, centered (pure CSS/HTML)

Add these as valid types in the schema's `ChartConfig.type` union.

#### 3. Cross-Page Global Filter Bar
Add a `globalFilters` field to `DashboardData` schema:
```
globalFilters: [
  { id: "region", label: "Region", type: "dropdown", options: ["All", "NA", "EMEA", "APAC"] },
  { id: "quarter", label: "Quarter", type: "segmented", options: ["Q1", "Q2", "Q3", "Q4"] },
  { id: "product", label: "Product Line", type: "chips", options: ["Enterprise", "SMB", "Growth"] }
]
```

The rendering engine adds a sticky filter bar below the top bar. When a filter is selected, charts and tables that have matching labels get filtered/highlighted. This is a visual enhancement — the data is client-side filtered by label matching.

#### 4. Update the LLM Prompt
In `generate-dashboard/index.ts`, update the system prompt to:
- Include `layout` as a required field per section
- List the new chart types and when to use each (e.g., "Use gantt for project timelines, heatmap for cross-dimensional comparisons, waterfall for financial breakdowns, funnel for pipeline/conversion")
- Require chart type diversity: "Each section MUST use a different primary chart type. No two sections should have the same chart type combination."
- Include `globalFilters` in the schema definition
- Add instruction: "Generate 3-4 global filters relevant to the role/industry"

#### 5. Update Variability Scoring
In `score-design-variability/index.ts`, update the AI prompt to also evaluate:
- Layout mode diversity across sections
- Chart type variety (penalize if >50% of charts are bar/line)
- Presence of advanced chart types (gantt, heatmap, treemap, waterfall, funnel)
- Cross-page filter presence and variety
- Add a new `interactivityScore` dimension to the result

Update `VariabilityResult` interface and `DesignVariabilityCard` UI to show the new interactivity dimension.

### Files to Change

| File | What |
|------|------|
| `src/lib/dashboard/schema.ts` | Add `layout` to `DashboardSection`, new chart types to `ChartConfig.type`, add `globalFilters` to `DashboardData` |
| `src/lib/dashboard/templates/scripts.ts` | New layout renderers, new chart renderers (heatmap, gantt, waterfall, funnel, treemap), global filter bar logic |
| `src/lib/dashboard/templates/styles.ts` | CSS for new layouts (split-panel, kpi-spotlight, grid-cards, etc.), filter bar, heatmap grid, funnel |
| `supabase/functions/generate-dashboard/index.ts` | Update system prompt with layout field, new chart types, global filters, diversity instructions |
| `supabase/functions/score-design-variability/index.ts` | Add interactivity scoring dimension, evaluate layout and chart diversity |
| `src/lib/api/designVariability.ts` | Add `interactivityScore` to `VariabilityResult` |
| `src/components/admin/DesignVariabilityCard.tsx` | Display interactivity score |

### Technical Notes

- Gantt, waterfall, and funnel are rendered using creative Chart.js configurations (floating bars, stacked horizontals) — no new libraries needed.
- Heatmap is pure HTML/CSS grid — lightweight and visually distinctive.
- Treemap uses the `chartjs-treemap` plugin which is small (~8KB) and added via CDN in the shell template.
- The global filter bar uses the existing cross-chart filtering pattern already in `scripts.ts`, extended to work across sections.
- Layout enforcement happens in the rendering engine: if adjacent sections have the same layout, the second one is remapped to a compatible alternative.

