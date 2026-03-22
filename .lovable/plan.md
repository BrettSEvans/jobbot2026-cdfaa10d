
## Plan: Permanently eliminate hidden/clipped text in generated materials

### Status: IMPLEMENTED ✅

### What was done

1. **Replaced clipping CSS guard with flow-safe layout** — `enforceOnePageLayout()` now uses `overflow: visible` for all text containers inside `.page-content`. Only the outermost `page-shell` clips at page boundary. Fixed heights, max-heights, and overflow:hidden are removed from all inner elements.

2. **Added deterministic HTML audit** — `auditHtmlForClipping()` inspects generated HTML for fixed heights, inline overflow:hidden, CSS overflow:hidden on content selectors, max-height on content elements, and absolute/fixed positioning. Returns typed violations.

3. **Added automatic clipping pattern stripper** — `stripClippingPatterns()` deterministically removes overflow:hidden, fixed heights, and absolute positioning from inline styles on text containers before AI review.

4. **Upgraded 3-cycle review with dual gate** — Review loop now requires BOTH AI `REVIEW_PASS` AND deterministic audit pass. Violations are fed back as context to the AI for targeted fixing. After 3 failed cycles, presents best-effort with explicit QA metadata.

5. **Updated generation prompt** — Added explicit CSS rules banning overflow:hidden on content elements, requiring height:auto and overflow:visible on all text containers.

6. **Updated refine-material** — Same overflow:hidden ban in the refinement system prompt.

7. **QA status in revision history UI** — Revision labels now include audit status (audit-clean vs best-effort). Badges show "Clean" (green) or "QA Issues" (red) in the revision list.

### Files changed
- `supabase/functions/generate-material/index.ts` — core engine rewrite
- `supabase/functions/refine-material/index.ts` — prompt update
- `src/components/GeneratedAssetRevisions.tsx` — QA status badges
- `src/components/DynamicMaterialsSection.tsx` — QA metadata in revision labels
