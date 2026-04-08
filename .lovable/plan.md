

## Multi-Phase Gantt Chart with Color-Coded Phases

### Problem
Currently, each customer row in the Gantt chart gets a different color. The user wants all customers to show the **same set of phases** (e.g., "Technical Setup", "Integration", "UAT") distinguished by color, with a legend at the bottom.

### Data Model Change

The current Gantt chart uses a **single dataset** with one bar per customer. To show phases, we need **multiple datasets** — one per phase — where each dataset contains `[start, end]` pairs for every customer.

**Current format (single dataset):**
```json
{
  "type": "gantt",
  "labels": ["Customer A", "Customer B"],
  "datasets": [{ "label": "Timeline", "data": [[0, 8], [2, 10]] }]
}
```

**New format (multi-dataset, one per phase):**
```json
{
  "type": "gantt",
  "labels": ["Customer A", "Customer B"],
  "datasets": [
    { "label": "Discovery", "data": [[0, 2], [2, 4]] },
    { "label": "Technical Setup", "data": [[2, 5], [4, 7]] },
    { "label": "Integration", "data": [[5, 7], [7, 9]] },
    { "label": "UAT & Go-Live", "data": [[7, 8], [9, 10]] }
  ]
}
```

### Changes

**1. `src/components/live-dashboard/ChartBlock.tsx` — Rewrite GanttChart**

- Detect multi-dataset Gantt charts (datasets.length > 1) and render **stacked horizontal bars**, one `<Bar>` per phase/dataset, all using `stackId="gantt"`.
- Each phase gets a consistent color from COLORS array, keyed by dataset index (not row index).
- All rows for the same phase share the same color.
- Add a `<Legend />` at the bottom showing phase names and their colors.
- For each dataset, compute `duration = end - start` per customer and use a transparent `start` bar for offset.
- Keep the single-dataset fallback for backward compatibility.

**2. `supabase/functions/generate-dashboard/index.ts` — Update prompt**

- Update the GANTT DATA FORMAT instruction to describe the multi-dataset phase format:
  - Labels = customer/project names (Y-axis rows)
  - Each dataset = one phase (e.g., "Technical Setup", "Integration")
  - Each dataset's data = `[start, end]` pairs, one per label
  - Phases should be sequential within each customer row
  - Include a concrete example in the prompt

### Files to modify

| File | Change |
|------|--------|
| `src/components/live-dashboard/ChartBlock.tsx` | Rewrite `GanttChart` to support multi-dataset phase rendering with per-phase colors and a Legend |
| `supabase/functions/generate-dashboard/index.ts` | Update GANTT DATA FORMAT to describe multi-dataset phase structure with example |

