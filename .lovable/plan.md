

## Fix: Convert "Key Customer Timeline Progress" to a Proper Gantt Chart

### Problem
The Gantt chart renderer expects data as `[start, end]` number pairs (e.g., `[1, 5]` for weeks 1–5), but the AI generates plain scalar numbers. This makes `duration = end - start = 0`, resulting in invisible thin lines.

### Changes

**1. Fix the generation prompt** (`supabase/functions/generate-dashboard/index.ts`)

Update the GANTT DATA FORMAT instruction to be explicit about the required array format:

```
GANTT DATA FORMAT: Each dataset entry MUST be a [start, end] number pair (e.g. [0, 3], [2, 6]) 
representing time units. Labels are task/milestone names. Use a SINGLE dataset. 
Example: labels: ["Discovery Phase", "Implementation", "UAT"], 
datasets: [{ label: "Timeline", data: [[0, 3], [2, 8], [7, 10]] }]
```

**2. Make the GanttChart renderer resilient** (`src/components/live-dashboard/ChartBlock.tsx`)

Add a fallback in `GanttChart` so if the AI produces plain numbers instead of arrays, the renderer auto-converts them into sequential ranges (each task gets a proportional bar width based on its value). Also enforce a minimum `barSize` of 20 and minimum duration of 1 to prevent invisible bars.

```tsx
// If data is scalar, convert to sequential gantt ranges
const ganttData = config.data.labels.map((label, i) => {
  const d = ds.data[i];
  if (Array.isArray(d)) {
    return { name: label, start: d[0], duration: Math.max(d[1] - d[0], 1), end: d[1] };
  }
  // Fallback: treat scalar as duration, stack sequentially
  const val = d as number;
  const prevEnd = i > 0 ? ganttData[i-1].end : 0; // won't work in map — use reduce instead
  return { name: label, start: prevEnd, duration: Math.max(val, 1), end: prevEnd + Math.max(val, 1) };
});
```

Will use a reduce loop instead of map for the sequential fallback.

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/generate-dashboard/index.ts` | Update GANTT DATA FORMAT with explicit `[start, end]` array example |
| `src/components/live-dashboard/ChartBlock.tsx` | Add scalar-to-range fallback in GanttChart, enforce minimum duration of 1 |

