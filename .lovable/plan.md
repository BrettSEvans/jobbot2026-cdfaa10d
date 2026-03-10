

# Add "Group by Status" Sort Option to Applications Grid

## What Changes

Add a new sort option "Group by Status" to the existing sort dropdown. When selected, applications display in collapsible accordion groups organized by pipeline stage (Created, Applied, Interviewing, etc.), all collapsed by default.

## Implementation

### `src/pages/Applications.tsx`

1. **Add new sort value** `"pipeline_stage-group"` to the `Select` dropdown options (after "Recently Updated").

2. **Compute grouped data** — a `useMemo` that, when `sortKey === "pipeline_stage"` and `sortDir === "group"`, groups `applications` by `pipeline_stage` using `PIPELINE_STAGES` ordering, filtering out empty groups.

3. **Conditional render** — when grouped mode is active, render an `Accordion` (type="multiple", defaultValue=[]) with one `AccordionItem` per stage group instead of the flat grid. Each item shows:
   - **Trigger**: Stage label + badge with count + colored dot matching `STAGE_COLORS`
   - **Content**: Same grid of `ApplicationCommandCard` components

4. When any other sort is selected, render the existing flat grid (no behavior change).

### Sort dropdown addition
```
<SelectItem value="pipeline_stage-group">Group by Status</SelectItem>
```

### Types update
- Extend `SortKey` to include `"pipeline_stage"`
- Handle the special `"group"` direction for this sort mode

No new files. No database changes. ~40 lines added to Applications.tsx.

