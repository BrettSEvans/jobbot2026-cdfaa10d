

## Plan: Fix frame overlap, sparse content, and color repetition in materials

### Problems identified

1. **Frame overlap bugs**: The CSS guard forces `position: static !important` on ALL content elements and resets ALL margins to `0 / 0.08in`, breaking intended spacing between frames and sections.
2. **Sparse content (10% fill)**: No detection or fix for documents that are too empty — only density (too much) triggers condensation.
3. **Same colors on every regeneration**: `buildStyleFamilies` always maps `brandColors[0]` → primary, `brandColors[1]` → secondary. Different families get different layouts but identical color assignments.
4. **`data-style-family` not reliably injected**: Relies on AI prompt compliance; needs programmatic fallback.

### Changes

#### 1. Fix CSS guard overlap issues (`enforceOnePageLayout`)
- Remove `margin-top: 0 !important; margin-bottom: 0.08in !important` from ALL divs/sections — this strips intended spacing and causes frames to collapse together
- Keep `position: static` only for `absolute/fixed` elements; allow `relative` positioning universally (current regex allowlist is too narrow)
- Remove the blanket `overflow: visible !important` on `.page-content *` — it fights with table cells and sidebar containers. Instead, only override `overflow: hidden` to `visible` on text-specific elements (p, h1-h6, li, span, blockquote)

#### 2. Add sparse content detection + expansion pass
After generation and density check, count stripped text characters. If `< 1500 chars` or `< 2 sections`, trigger an expansion prompt asking the AI to:
- Add content to reach 80-85% page fill
- Add 1-2 more bullet points per section
- Expand short paragraphs to 2 sentences
- Keep the same layout and style family

#### 3. Rotate colors across families and regenerations
- Change `buildStyleFamilies` to accept a `colorRotation: number` parameter
- Rotate the color array: `colors[(0 + rotation) % len]` → primary, etc.
- For initial generation: `colorRotation = assetIndex` (0, 1, 2 for each sibling)
- For regeneration: `colorRotation = regenerationCount`
- This ensures each material AND each regeneration uses a different primary color from the brand palette

#### 4. Force-inject `data-style-family` attribute
After `enforceOnePageLayout`, programmatically check if `<body` tag contains `data-style-family`. If not, inject it using string replacement on the `<body` tag.

### Files to modify
- `supabase/functions/generate-material/index.ts` — all 4 changes above

