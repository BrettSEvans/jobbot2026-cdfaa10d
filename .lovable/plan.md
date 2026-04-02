

## Plan: Improve Dashboard Storytelling and Reduce Information Density

### Problem
Each dashboard tab packs metrics + charts + a table with no narrative hierarchy. A hiring manager lands on a tab and sees a wall of data without understanding the "so what." The root cause is in both the **research prompt** (asks for too many sections with too many components each) and the **generation prompt** (no storytelling guidance, every section gets the same structure).

### Diagnosis (Plaid Dashboard)
- 4 content sections + 2 system tabs (Agentic, CFO)
- Every section has 3-4 metrics, 1-2 charts, AND a table — no variation in density
- Section descriptions are generic ("why this matters") rather than insight-driven ("what you should conclude")
- No executive summary / opening narrative
- Research prompt asks for 8-12 sections with 3-5 metrics and 2-3 charts each

### Changes

#### 1. Research Prompt (`supabase/functions/research-company/index.ts`)
- Reduce section count from 8-12 to **5-7** (plus the 2 system tabs)
- Add a required `"keyInsight"` field per section — one sentence the viewer should take away
- Add a `"sectionRole"` field: `"overview"`, `"deep-dive"`, `"evidence"`, or `"action"` — so sections form a narrative arc
- Reduce metrics per section from 3-5 to **2-3**
- Reduce charts per section from 2-3 to **1-2**
- Add a top-level `"narrativeArc"` field — a 2-sentence summary of the story the dashboard tells

#### 2. Generation Prompt (`supabase/functions/generate-dashboard/index.ts`)
- Add **storytelling rules** to the system prompt:
  - Section 1 must be an overview/summary that sets context (kpi-spotlight layout, metrics only, no table)
  - Not every section needs all three component types — lighter sections (metrics-only or chart-only) are encouraged
  - Each section must have a `"description"` that states the **key takeaway**, not just topic context
  - Tables should only appear in "evidence" or "deep-dive" sections (max 2-3 tables total)
- Add a `"candidate"` object instruction to the prompt so the hero section gets generated with the dashboard
- Reduce the metrics-per-section guidance from "3-5" to "2-4, prefer fewer"
- Add rule: "The first section should answer 'Why should you hire this person?' The last content section should answer 'What's the ROI?'"

#### 3. Validation (`generate-dashboard/index.ts` validateAndRepair)
- Warn (don't reject) if total table count exceeds 3
- Warn if any section has more than 4 metrics

### Files Changed
| File | Change |
|---|---|
| `supabase/functions/research-company/index.ts` | Reduce section count, add keyInsight/sectionRole/narrativeArc fields |
| `supabase/functions/generate-dashboard/index.ts` | Add storytelling rules, reduce per-section density, candidate object guidance |

### What stays the same
- DashboardRenderer.tsx — no changes needed, it already handles variable section density
- Schema — no changes (all fields are already optional)
- CFO scenarios and Agentic Workforce sections — unchanged
- Existing dashboard data — unaffected (only new generations will use updated prompts)

