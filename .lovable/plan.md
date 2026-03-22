# Fix Resume Preview, Add Charts to Materials, and Fix Branding Data Flow

## Problems Identified

1. **Resume preview requires scrolling** — uses a fixed `height: "60vh"` iframe instead of the fit-to-page scaling used by materials
2. **Branding colors/fonts not passed to material generation** — `backgroundGenerator.ts` sends branding to the dashboard but NOT to `generate-material`. The system prompt in `generate-material/index.ts` has zero branding context. This is why materials use only one generic color.
3. **Company fonts not used in materials** — the scraper extracts fonts correctly, but they never reach the material generation prompt
4. **No charts/graphs in materials** — the variability system mentions charts as a pattern but the prompt doesn't explicitly encourage them as a design element

## Plan

### 1. Fix resume preview to fit full page (`src/pages/ApplicationDetail.tsx`)

Replace the resume iframe from `height: "60vh"` with the same `FitPagePreview` component (or equivalent scaling logic) already used for materials. This eliminates scrolling and shows the full resume at a glance.

- Import or inline the same scaling approach: fixed 816×1056px iframe with `transform: scale()` based on container width
- Remove `height: "60vh"` and `overflow` styles
- Apply to both the normal view and the revision preview

### 2. Pass branding data to material generation (`src/lib/backgroundGenerator.ts`)

Add `branding: brandingData` to the request body sent to `generate-material` in the background generation loop (around line 370). The branding object includes colors, fonts, extracted colors, and extracted fonts from the scraper.

### 3. Use branding in material prompt (`supabase/functions/generate-material/index.ts`)

- Accept `branding` from the request body
- Add a branding section to the system prompt that includes:
  - **All scraped colors** (primary, secondary, accent, extracted dominant colors) with instructions to use multiple colors in similar patterns— not just one
  - **Company fonts** with a Google Fonts `<link>` injection instruction so the generated HTML actually loads and uses them
  - Explicit rule: "Use at least 3 different brand colors across the document — primary for headers/accents, secondary for backgrounds/borders, accent for highlights/callouts"

### 4. Add chart/graph design element option (`supabase/functions/generate-material/index.ts`)

Add to the variability section of the system prompt:

- "You MAY include ONE small data visualization element (mini chart, progress bar, simple bar graph, Gantt-style timeline, or data table) per document to increase visual variety. This is optional but encouraged when it adds value. Use inline SVG or CSS-only visualizations — no external libraries. Maximum one per page."
- Add `chart/visual` and `data-table` to the list of content block patterns the AI can choose from

### 5. Consolidate branding color instruction in scraper output (`supabase/functions/scrape-company-branding/index.ts`)

Add a `colorPalette` summary field to the branding response that merges Firecrawl branding colors and extracted dominant colors into a single ordered array of hex values. This makes it easier for downstream consumers to use a full palette rather than picking just one color.

### Files to modify

- `src/pages/ApplicationDetail.tsx` — resume fit-to-page preview
- `src/lib/backgroundGenerator.ts` — pass branding to generate-material
- `supabase/functions/generate-material/index.ts` — accept branding, add to prompt, add chart option
- `supabase/functions/scrape-company-branding/index.ts` — add consolidated colorPalette array