## Plan: Fix Nav Behavior, Add Icons, Collapsible Icon Rail, and Prompt Updates

### Problems

1. &nbsp;
2. **No icons** — nav items show a `ChevronRight` chevron instead of the `icon` field from the data
3. **Collapsed sidebar disappears entirely** — goes to `w-0` instead of an icon-only rail
4. **Prompts don't enforce Lucide icon names** — schema says "material_icon_name" but the React app uses Lucide

### Additional UX improvements a critical reviewer would flag

- **Candidate Hero repeats on every nav click** — it should be sticky/persistent above the sections, not re-rendered inside the scrollable area (or only shown on the first/overview nav)
  &nbsp;
- **No active section indicator** — as you scroll through sections, the sidebar doesn't highlight which section is in view
- **Footer always visible** — takes space; should only show at the bottom of the last section

### Changes

#### 1. Renderer: Icon mapping + icon rail (`DashboardRenderer.tsx`)

- Create a `lucideIconMap` that maps common icon names (from the LLM output, e.g. "dashboard", "trending_up", "people", "attach_money") to Lucide React components
- Render the mapped icon left-justified in each nav button
- When sidebar is collapsed on desktop, show a narrow icon rail (`w-14`) with just icons (tooltip on hover) instead of `w-0`
- On mobile, behavior unchanged (overlay sidebar)



#### 3. Renderer: Candidate Hero placement

- Move `CandidateHero` above the nav-filtered content area so it's always visible regardless of active nav (or only show on overview)

#### 4. Generation prompt: Use Lucide icon names (`generate-dashboard/index.ts`)

- Change the schema example from `"icon": "material_icon_name"` to `"icon": "lucide-icon-name"` 
- Add a list of recommended Lucide icon names: `"layout-dashboard"`, `"trending-up"`, `"users"`, `"dollar-sign"`, `"target"`, `"bar-chart-3"`, `"briefcase"`, `"rocket"`, `"shield-check"`, `"brain"`, `"calculator"`, `"git-branch"`, `"map-pin"`, `"zap"`, `"pie-chart"`, `"activity"`
- Add instruction: "Use kebab-case Lucide React icon names for navigation icons"

#### 5. Research prompt: Add icon field (`research-company/index.ts`)

- Add `"icon"` to the section schema in the research prompt with the same Lucide icon guidance
- So the research agent passes icon names through to the generation step



### What stays the same

- Schema (`schema.ts`) — `NavItem.icon` is already `string`, no change needed
- `PublishDashboard.tsx` — unchanged
- Database — no migrations
- Existing dashboard data — will work with fallback icons for unmapped names