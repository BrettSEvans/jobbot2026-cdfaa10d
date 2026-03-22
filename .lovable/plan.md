
## Plan: Enforce simplicity across all materials + collapsible variability card

### Status: IMPLEMENTED ✅

### What was done

1. **Tightened density thresholds** — Sections: 5→4, Bullets: 25→16, Table rows: 8→5, Chars: 4000→3000
2. **Strengthened generation prompt** — Max 3 body sections, 3-4 bullets/section, 50-word paragraph cap, 80-85% page fill target, banned framed/boxed containers for plan/template docs
3. **Tightened condensation pass** — Max 3 sections, 3-4 bullets, 3-4 table rows, removes framed containers
4. **Updated best-practices research rubric** — Both inline (generate-material) and standalone (research-asset-best-practices) now enforce max 3 sections, stricter budgets
5. **Made DesignVariabilityCard collapsible** — Wrapped in Collapsible component, starts collapsed, shows score badge in header
6. **Updated refine-material** — Same 3-section, 50-word, no-frames rules

### Files changed
- `supabase/functions/generate-material/index.ts` — thresholds, prompts, condensation
- `supabase/functions/refine-material/index.ts` — prompt update
- `supabase/functions/research-asset-best-practices/index.ts` — rubric limits
- `src/components/admin/DesignVariabilityCard.tsx` — collapsible UI
