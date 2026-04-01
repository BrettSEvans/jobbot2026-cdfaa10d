
## Plan: Make Global/Page Filters Truly Refilter Data (Systemic Fix)

### Diagnosis (why this is systemic)
- Current global filters mostly **dim visuals** instead of changing underlying datasets.
- Filtering uses broad string matching on `data-labels`, not filter-aware field logic (`filter.id` → data dimension).
- Segmented/chip filters default to first value (often no “All”), so hidden filters are always active.
- Multiple filters are combined with strict AND even when a visualization doesn’t contain those dimensions.
- Generated dashboards can have filter options (e.g., US/CA/UK/EU) that don’t match row/chart vocab (e.g., North America/EMEA).

### Implementation

1. **Refactor filter engine in `src/lib/dashboard/templates/scripts.ts`**
   - Introduce a structured `filterContext` and apply filtering by dimension, not plain substring.
   - For each visualization, determine whether a selected filter is applicable; if not applicable, skip that filter for that viz (don’t dim by default).

2. **Make table filtering truly data-driven**
   - In table registry, store original row objects plus column-key metadata.
   - Apply global filters against row fields (with dimension aliases like region/geo/country) and then render visible rows.
   - Keep per-table count updates accurate after each filter change.

3. **Make chart filtering actually change what is shown**
   - For Chart.js and custom charts (heatmap/funnel/waterfall/gantt), store original chart data and rebuild filtered datasets/labels on selection.
   - Keep “dim” behavior only as a fallback when partial match is intended; primary behavior is data subset/refilter.

4. **Fix filter state UX defaults**
   - Ensure every filter type can reset to `All` (including segmented/chips by prepending `All` if missing).
   - Add a clear/reset path so switching selections always recomputes from original data.

5. **Fix page-level table filter isolation**
   - Scope `activeColumnFilters` per-table instance (currently global by column index, causing collisions).
   - Ensure page-level filter + global filter compose deterministically.

6. **Harden generation consistency in `supabase/functions/generate-dashboard/index.ts`**
   - Update prompt rules so each global filter dimension is represented in section data fields/labels that should respond.
   - Enforce value vocabulary alignment between filter options and generated data tokens (e.g., US/CA/UK/EU everywhere if chosen).

7. **Branding check for interactive popup**
   - Confirm popup remains site-branded and company-branded consistently (logo/name fallback hierarchy), without regressing current behavior.

### Validation checklist (Plaid-specific)
- In Competitive Landscape, switching Region US → CA → UK → EU visibly changes table/chart content (not just gray-out).
- Changing one filter then another re-filters from original source data, not previously dimmed state.
- `All` restores full data on current page and across pages.
- Page-level column filters work independently per table and combine correctly with global filters.
