

## Career Command Center — Applications Dashboard Redesign

### Overview
Replace the current flat table/card list with a visually rich, card-based "command center" layout featuring progress rings, prominent company logos, asset completion indicators, and pipeline stage badges. The desktop table and mobile card list both get upgraded.

### New Components

**1. `src/components/ProgressRing.tsx`** — SVG circular progress indicator
- Takes `value` (0-100), `size`, `strokeWidth`, and optional color
- Used to show asset completion percentage per application (e.g., 4/6 assets = 67%)
- Amber/gold stroke color matching the brand identity

**2. `src/components/ApplicationCommandCard.tsx`** — Rich application card (replaces both desktop table rows and mobile `ApplicationCard`)
- Layout per card:

```text
┌──────────────────────────────────────────────┐
│ ┌──────┐  Company Name          [Stage Badge]│
│ │ LOGO │  Job Title             [ATS: 85]    │
│ │ 48px │  Applied 3 days ago                 │
│ └──────┘                                     │
│──────────────────────────────────────────────│
│ ○ Dashboard  ○ Cover Letter  ○ Exec Report   │
│ ○ RAID Log   ○ Architecture  ○ Roadmap       │
│  ━━━━━━━━━━━━━━━━━━━  4/6 assets      [⋮]   │
│         progress bar                         │
└──────────────────────────────────────────────┘
```

- Company icon at 48px (prominent)
- Pipeline stage as a colored badge (using existing `STAGE_COLORS`)
- ATS score shown as a small pill if available
- Asset completion as a horizontal progress bar with labeled dots (filled = generated, pulsing = generating, empty = pending)
- Time-relative date ("3 days ago" via `date-fns formatDistanceToNow`)
- Subtle warm shadow on hover (`shadow-warm` from design system)
- Context menu (three-dot) for Copy CL, Preview, Copy HTML, Delete actions

### Changes to `src/pages/Applications.tsx`

**Active tab redesign:**
- Replace the `md:hidden` mobile card list AND the `hidden md:block` desktop table with a single responsive grid:
  - `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`
- Each cell renders `ApplicationCommandCard`
- Keep the slide-in preview panel (only on desktop, triggered from card actions)
- Keep sorting — add a sort dropdown above the grid instead of clickable column headers
- Keep the existing skeleton loading state but adapt to card grid (3 skeleton cards)

**Header update:**
- Change subtitle from "Your saved applications and dashboards" to "Your career command center"
- Add a summary stat bar above the grid: total apps, complete count, in-progress count (small badges)

### Files Modified

| File | Change |
|------|--------|
| `src/components/ProgressRing.tsx` | New — SVG progress ring component |
| `src/components/ApplicationCommandCard.tsx` | New — rich card replacing table rows and old mobile cards |
| `src/pages/Applications.tsx` | Replace table + mobile cards with card grid, add sort dropdown, update header copy, add summary stats |
| `src/components/ApplicationCard.tsx` | Deprecated (no longer imported, can be kept for reference) |

### What Stays the Same
- All CRUD operations, soft delete, restore, trash tab
- Pipeline/Kanban tab (untouched)
- Ghost prompt dialogs, stale bookmarked nudge banners
- Background generation subscription and status tracking
- Preview panel functionality
- `ProUsageBar`, `BatchModePrompt`, `ImpersonationNotice`

### Design Tokens Used
- `shadow-warm` for hover elevation
- `--gradient-warm` for progress ring/bar fills
- `font-heading` (DM Serif Display) for company names
- Primary amber for completed assets, `muted-foreground/25` for pending

