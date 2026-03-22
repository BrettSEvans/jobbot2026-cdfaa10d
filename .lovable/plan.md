# Fix Material Overflow, Preview, and Auto-Retry

## Problems Identified

1. **Title text clipped at top** — padding in `.page-shell` is insufficient or AI-generated styles override it
2. **Footer not visible / overlaps content** — AI-generated CSS conflicts with the enforced one-page guard styles (e.g., the AI sets its own `height`, `position`, or `overflow` on containers)
3. **Scrollable frames inside documents** — the iframe preview container has `overflow: auto` and the iframe has a fixed `height: 1160px`, which allows scrolling instead of fitting to page
4. **Content cut off at bottom** — AI generates too many sections; no post-generation overflow detection or auto-retry exists
5. **No overflow detector** — content is saved even when it overflows

## Plan

### 1. Harden `enforceOnePageLayout` post-processor (`supabase/functions/generate-material/index.ts`)

**Strip conflicting AI-generated styles more aggressively:**

- Add CSS overrides in the one-page guard that reset common AI conflicts: `body > * { height: auto !important; }`, strip any `position: absolute/fixed` on footer-like elements, reset `overflow: scroll/auto` to `hidden` on all elements inside `.page-content`
- Add `overflow: hidden !important` to ALL elements inside `.page-content` to prevent any scrollable regions
- Increase top padding slightly to prevent title clipping (0.35in → 0.4in)

### 2. Add overflow detection and auto-retry in the edge function (`supabase/functions/generate-material/index.ts`)

After the AI generates HTML and `enforceOnePageLayout` processes it:

- Send a **second AI call** asking: "Given this HTML document constrained to 8.5x11in with 0.4in padding, does the content likely overflow? Count the sections, estimate line counts, check for dense tables. If it overflows, return a condensed version that fits.  the condensed verion should use font size 9 or larger.  if the resize make sthe font smaller than 9, the content needs to be trimmed to fit. If it fits, return FITS_OK."
- Parse the response: if the AI returns revised HTML, use the condensed version through `enforceOnePageLayout` again
- Limit to 1 retry to avoid excessive API calls
- Add a `condensation_applied` flag in the response so the frontend knows

### 3. Strengthen the system prompt (`supabase/functions/generate-material/index.ts`)

- Add explicit rule: "NEVER use `overflow: auto`, `overflow: scroll`, or `overflow-y: auto` on any element. All content must be statically laid out."
- Add: "NEVER use more than 5 content sections. If the document type demands more, merge sections."
- Add: "Titles must have at minimum 0.1in of clear space above them. Never position content at the very edge of the page."
- Reduce `max_tokens` from 8000 to 6000 to naturally limit content volume

### 4. Fix iframe preview to "fit page" mode (`src/components/DynamicMaterialsSection.tsx`)

Change the material preview from a scrollable iframe to a scaled-to-fit preview:

- Replace the current `style={{ width: "100%", height: "1160px" }}` with a CSS transform approach:
  - Set iframe to actual page dimensions (816px × 1056px = 8.5in × 11in at 96dpi)
  - Use `transform: scale(X)` where X is calculated from container width / 816
  - Set `overflow: hidden` on the container — no scrolling allowed
- Remove `overflow: auto` from the Card wrapper
- Apply same treatment to legacy asset iframes

### 5. Apply one-page guard to Vibe Edit output (`src/components/DynamicMaterialsSection.tsx`)

After the Vibe Edit streaming completes (line ~441), run the cleaned HTML through the same `enforceOnePageLayout` normalization. Since that function lives in the edge function, extract the CSS injection logic into a shared client-side utility or add the one-page guard CSS string injection in the `onDone` callback.

### 6. Update `refine-material` prompt (`supabase/functions/refine-material/index.ts`)

Add to the system prompt:

- "The document MUST fit on exactly one printed US Letter page (8.5x11in). Do NOT add content that would cause overflow."
- "NEVER use overflow: auto or overflow: scroll on any element."

### Files to modify

- `supabase/functions/generate-material/index.ts` — harden CSS, add overflow detector/auto-retry, strengthen prompt
- `supabase/functions/refine-material/index.ts` — add one-page constraint to refine prompt
- `src/components/DynamicMaterialsSection.tsx` — fit-page preview, client-side one-page guard for vibe edits