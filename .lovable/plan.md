

## Plan: Diverse Layout Styles for Dynamic Assets

### Problem
All dynamic assets (e.g., "Gen AI Program Charter", "Risk Mitigation", "Review") use the same `generate-dynamic-asset` edge function with a generic prompt, producing visually identical layouts (header + body + table). This undermines the user's ability to showcase breadth when presenting to hiring managers.

### Solution
Create a **layout style registry** — a set of distinct visual layout templates that the AI is instructed to follow per asset. Each asset within an application gets assigned a different layout style, ensuring visual variety while maintaining consistent company branding.

---

### 1. Create layout style registry

**New file: `src/lib/assetLayoutStyles.ts`**

Define 6+ layout style profiles, each describing a distinct visual structure:

| Style ID | Name | Description |
|----------|------|-------------|
| `executive-brief` | Executive Brief | Clean single-column, large header bar, pull-quote callouts, minimal tables |
| `data-grid` | Data Grid | Table-heavy layout with KPI cards across the top, alternating row stripes |
| `magazine` | Magazine | Two-column layout, sidebar with key metrics, main body with narrative flow |
| `timeline` | Timeline | Vertical timeline with milestones, status indicators, connected nodes |
| `scorecard` | Scorecard | Grid of score/metric cards with progress bars, RAG status indicators |
| `infographic` | Infographic | Visual-heavy with icon sections, horizontal progress bars, stat blocks |

Each profile contains:
- `id`, `name`, `cssGuidance` (detailed CSS/layout instructions for the AI prompt)
- `structureGuidance` (what HTML elements to use — e.g., CSS Grid, flexbox cards, timeline nodes)

Export a function `assignLayoutStyles(assetNames: string[]): Record<string, LayoutStyle>` that deterministically assigns a different style to each asset (round-robin or hash-based), ensuring no two assets in the same application share a layout.

### 2. Update `generate-dynamic-asset` edge function

**File: `supabase/functions/generate-dynamic-asset/index.ts`**

- Accept a new optional `layoutStyle` field in the request body (contains `name`, `cssGuidance`, `structureGuidance`)
- Inject the layout instructions into the system prompt after the branding section:

```
LAYOUT STYLE: "${layoutStyle.name}"
${layoutStyle.cssGuidance}
${layoutStyle.structureGuidance}

CRITICAL: You MUST follow this specific layout style. Do NOT default to a simple header-body-table layout.
```

### 3. Update `refine-dynamic-asset` edge function

**File: `supabase/functions/refine-dynamic-asset/index.ts`**

- Accept `layoutStyle` and pass it through to the refinement prompt so the style is preserved during refinements

### 4. Wire layout assignment into generation flow

**File: `src/lib/api/dynamicAssets.ts`**

- In `streamDynamicAssetGeneration`, accept an optional `layoutStyle` parameter and pass it to the edge function body
- Update `streamRefineDynamicAsset` similarly

**File: `src/components/DynamicAssetTab.tsx`**

- Import `assignLayoutStyles` from the registry
- When generating, look up the asset's assigned layout style based on the asset name and sibling assets in the application
- Pass it through to `streamDynamicAssetGeneration`

### 5. Update `propose-assets` to avoid layout-similar suggestions

**File: `supabase/functions/propose-assets/index.ts`**

- Add instruction to the system prompt: "Ensure the 6 suggested document types span different formats — include a mix of narrative documents, tabular reports, visual timelines, and scorecard-style assessments. Avoid suggesting documents that would all use the same table-heavy layout."

### 6. Also apply to fixed asset types

**Files: `supabase/functions/generate-executive-report/index.ts`, `generate-raid-log/index.ts`, `generate-roadmap/index.ts`**

- These already have distinct prompts with specific structures (Gantt chart for roadmap, RAID tables for RAID log, etc.), so they naturally differ. No changes needed — they already produce differentiated layouts.

---

### Files changed

| File | Change |
|------|--------|
| `src/lib/assetLayoutStyles.ts` | New — layout style registry with 6 styles + assignment function |
| `supabase/functions/generate-dynamic-asset/index.ts` | Accept `layoutStyle`, inject into prompt |
| `supabase/functions/refine-dynamic-asset/index.ts` | Accept `layoutStyle`, preserve during refinement |
| `src/lib/api/dynamicAssets.ts` | Pass `layoutStyle` through to edge functions |
| `src/components/DynamicAssetTab.tsx` | Assign and pass layout style during generation |
| `supabase/functions/propose-assets/index.ts` | Prompt update for format diversity |

