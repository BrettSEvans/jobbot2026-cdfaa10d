
## Plan: 6 Style Families with premium design guidance

### Status: IMPLEMENTED ✅

### What was done

1. **Defined 6 distinct style families** in `generate-material/index.ts`:
   - **A — Executive Bold**: Full-width dark banner, metric cards, Montserrat+Lato
   - **B — Modern Split**: 60/40 sidebar, quick-facts, Bebas Neue+Roboto
   - **C — Clean Contrast**: Alternating bands, pull-quote, complementary color scheme, Playfair+Garamond
   - **D — Data Storyteller**: Styled HTML table (3-4 rows), Montserrat+DM Sans
   - **E — Visual Metrics**: CSS progress bars/donut charts, Bebas Neue+Lato
   - **F — Editorial Minimal**: Magazine-style narrow column, large pull-quote, Playfair+Source Sans

2. **Best-fit family selection** — classifies asset type (analytical-table, analytical-chart, strategic, communication, report, general) and maps to preferred families, excluding siblings' used families

3. **Forced family switch on 2+ regenerations** — client passes `regenerationCount`, edge function excludes current family when count ≥ 2

4. **Premium design rules** injected per family — 60-30-10 color rule, specific typography pairings, signature visual elements, narrative angles, white space guidance

5. **Client updates** — `DynamicMaterialsSection.tsx` counts revisions and passes `regenerationCount`; `backgroundGenerator.ts` passes `regenerationCount: 0` on initial generation

### Files changed
- `supabase/functions/generate-material/index.ts` — style family definitions, selection logic, prompt injection
- `src/components/DynamicMaterialsSection.tsx` — regeneration count tracking
- `src/lib/backgroundGenerator.ts` — pass regenerationCount on initial generation
