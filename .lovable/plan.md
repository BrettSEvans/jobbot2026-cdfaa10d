

## Plan: Human-in-the-Loop Dashboard Generation

### Overview

Insert three user decision points into the dashboard generation pipeline. The pipeline currently runs fully automated in the background. We'll pause it at three points to collect user preferences before continuing, resulting in more personalized dashboards.

### Architecture

The pipeline currently flows: Scrape → Analyze → Resume → Cover Letter → Materials → Dashboard (all automated). We'll split the dashboard phase into sub-steps with user prompts:

```text
... Materials complete ...
  │
  ├─ 1. Research Agent runs (enhanced: also generates CFO scenarios)
  │
  ├─ PAUSE → Show "Dashboard Customization" dialog
  │    ├─ Step A: Pick 2 brand colors (from scraped branding + color pickers)
  │    ├─ Step B: Select sections (10+ options from research, app recommends count)
  │    └─ Step C: Select CFO scenarios (7 ranked options, app pre-selects top 3)
  │
  ├─ User clicks "Generate Dashboard" →
  │    └─ Pipeline resumes with user's choices injected into the generation prompt
  │
  └─ Dashboard renders
```

### Changes

**1. New component: `src/components/DashboardCustomizationDialog.tsx`**
- Multi-step modal dialog (3 tabs/steps or a single scrollable form)
- **Step A — Brand Colors**: Two color pickers initialized from scraped branding `primary`/`secondary` colors. User can adjust. Shows a small live preview swatch of header + sidebar using chosen colors.
- **Step B — Sections**: Displays all researched sections (10+) as checkboxes with icon, label, and description. Header says "Select X–Y sections for your dashboard" (recommendation based on research count). Pre-checks the top ones.
- **Step C — CFO Scenarios**: Displays 7 AI-ranked scenarios as a ranked list with radio/checkbox selection (pick 3). Each shows title, description, and a "relevance" badge. Pre-selects top 3.
- Emits `onConfirm({ colors, selectedSections, selectedScenarios })`.

**2. Enhanced research agent: `supabase/functions/research-company/index.ts`**
- Expand the system prompt to also generate 7 CFO scenario specifications (not just sections)
- Each CFO scenario spec includes: id, title, description, type, relevance ranking (1-7), slider definitions with `controlType` (slider/toggle/segmented variety), baseline values, and `currencyFormat: true`
- Output schema adds `cfoScenarios` array alongside `sections`
- Return 10+ section options (increase from current 5-7 to "8-12")

**3. Update `src/lib/api/researchCompany.ts`**
- Add `ResearchedCFOScenario` interface to the types
- Include `cfoScenarios` in `ResearchResult`

**4. Update `src/lib/backgroundGenerator.ts`**
- After research completes and before dashboard generation, set a new status: `"awaiting-dashboard-config"`
- Store research results (sections + CFO scenarios) on the job object so the UI can read them
- Add a new method `resumeDashboardGeneration(appId, userChoices)` that the dialog calls after user confirms
- This method continues the pipeline from where it paused, passing user-selected sections, colors, and CFO scenarios to `streamDashboardGeneration`

**5. Update `GenerationJob` type**
- Add optional fields: `researchedSections`, `researchedCfoScenarios`, `scrapedBranding` to carry data for the dialog
- Add status `"awaiting-dashboard-config"` to `GenerationJobStatus`

**6. Wire dialog into `src/components/DynamicMaterialsSection.tsx` (or `ApplicationDetail.tsx`)**
- When the background job status is `"awaiting-dashboard-config"`, auto-open the `DashboardCustomizationDialog`
- Pass researched sections, CFO scenarios, and scraped branding colors as props
- On confirm, call `backgroundGenerator.resumeDashboardGeneration(appId, choices)`

**7. Update `supabase/functions/generate-dashboard/index.ts`**
- Accept `userColors` (primary, secondary) in the request body and use them as the seed for the Material You tonal palette instead of deriving from branding
- Accept `selectedCfoScenarios` (pre-built scenario specs from research) and inject them into the prompt so the LLM fills in data but follows the user's chosen scenarios
- Add instruction for `$` currency labels on CFO chart Y-axes

**8. Update CFO chart rendering in `src/lib/dashboard/templates/scripts.ts`**
- Add `$` currency formatting to Y-axis tick callbacks (e.g., `$1.2M`, `$500K`)
- Ensure `controlType` field is respected from the scenario data (already partially implemented — verify toggle/segmented/slider variety comes from data, not just index-based alternation)

**9. Update `src/lib/dashboard/schema.ts`**
- Add `controlType?: "slider" | "toggle" | "segmented"` to `SliderConfig`
- Add `options?: Array<{ label: string; value: number }>` to `SliderConfig`
- Add `currencyFormat?: boolean` to `CFOScenario`

### User Experience Flow

1. User submits a job application → resume/cover letter/materials generate as before
2. When dashboard phase begins, research agent runs (enhanced with CFO scenarios)
3. A dialog appears: "Customize Your Dashboard"
4. User picks colors, sections, and CFO scenarios across three clear steps
5. User clicks "Generate Dashboard" → dialog closes, dashboard generates with their choices
6. If user dismisses without choosing, defaults are used (top sections, top 3 scenarios, scraped colors)

### Files to Create/Modify
- **Create**: `src/components/DashboardCustomizationDialog.tsx`
- **Modify**: `supabase/functions/research-company/index.ts` (add CFO scenario research)
- **Modify**: `src/lib/api/researchCompany.ts` (add CFO types)
- **Modify**: `src/lib/backgroundGenerator.ts` (pause/resume + carry research data)
- **Modify**: `src/lib/dashboard/schema.ts` (SliderConfig enhancements)
- **Modify**: `src/lib/dashboard/templates/scripts.ts` ($ formatting on CFO charts)
- **Modify**: `supabase/functions/generate-dashboard/index.ts` (accept user choices)
- **Modify**: `src/components/DynamicMaterialsSection.tsx` or `src/pages/ApplicationDetail.tsx` (show dialog)

