

## Plan: Holistic Layout Balance, Bullet Alignment & Page Fill Enforcement

### Problem
1. **Bullet icons flush with page edge** — list padding is too small (0.16in), and AI-generated icon bullets (spans, pseudo-elements) get pushed against the left margin.
2. **Layouts look unbalanced** — the review pipeline checks individual elements (overlap, clipping, font size) but never evaluates the **whole-page composition**: visual weight distribution, consistent spacing rhythms, alignment coherence, or whether the document reads as a cohesive, professional layout.
3. **Page fill not enforced in review** — the 80-85% fill target exists in the generation prompt, but the review pipeline (which is the final gatekeeper) never checks whether the page is actually filled. Sparse documents can pass all 10 checks and ship half-empty.

### Changes

#### 1. Fix bullet alignment — `enforceOnePageLayout` CSS (lines 272-274)

Increase default list padding and add rules for icon-style bullets:

```css
/* Before */
padding-left: 0.16in !important;

/* After */
padding-left: 0.3in !important;

/* New rules */
li { position: relative; padding-left: 0.15in; }
[class*="bullet"], [class*="icon"] { margin-left: 0.15in; }
```

#### 2. Add holistic layout rules to the system prompt (~line 1079-1110)

Add a new `## LAYOUT BALANCE & PROFESSIONAL POLISH` section with rules that address the **entire document** as a composition, not individual elements:

- **Visual weight distribution**: The page should feel balanced top-to-bottom and left-to-right. No half of the page should be significantly denser than the other.
- **Consistent spacing rhythm**: All peer sections must use the same `margin-bottom`. Cards/frames at the same level must have equal padding and border styling.
- **Equal-height rows**: Cards or columns in the same row must use `align-items: stretch` so they match height.
- **Alignment coherence**: All body section headings must use the same alignment (all left or all center — never mixed). Margins and padding must be uniform across peer elements.
- **No orphan elements**: A single card alone in a grid row should span full width, not sit in a half-width cell with empty space beside it.
- **White space as design**: Margins between sections should feel intentional and even, not random.

#### 3. Expand review pipeline to check holistic balance + page fill (lines 432-468)

Add three new checks to `COMBINED_REVIEW_PROMPT`:

```
11. HOLISTIC BALANCE: Step back and evaluate the ENTIRE page as one composition.
    - Is visual weight evenly distributed? (No half of the page should be 3x denser than the other)
    - Do all peer sections have consistent padding, borders, and spacing?
    - Are cards/frames in the same row equal height?
    - Is section spacing uniform throughout?
    - Does the page look like a single cohesive design, or a patchwork of disconnected blocks?
    If the layout feels lopsided, asymmetric, or amateurish, restructure sections for visual harmony.

12. ALIGNMENT CONSISTENCY: All body section headings must use the same alignment style.
    Bullet markers and icons must sit INSIDE their text block (not flush with the page edge).
    Padding and margins must be uniform across peer elements at the same hierarchy level.

13. PAGE FILL: The document must fill 80-85% of the usable page area (~9.2in × 7.5in).
    - If the content only fills ~50-60% of the page, ADD more substantive content (extra bullets,
      an additional relevant section, or a data element) to reach the 80% target.
    - If content exceeds 90%, condense the least valuable section.
    - An under-filled page is a FAILURE — it looks incomplete to a hiring manager.
    When fixing page fill, maintain all other layout rules (no overflow:hidden, height:auto, etc.).
```

Update the fix rules section to include:
- For BALANCE issues: redistribute content, equalize section sizes, add consistent padding
- For PAGE FILL: expand sparse content with relevant professional material, never leave a document looking half-empty

#### 4. Strengthen sparse detection (lines 1222-1250)

The current sparse check uses `textLength < 1500`. Tighten this:
- Lower the sparse threshold to `textLength < 1800` to catch more under-filled documents
- After the expansion pass, re-check: if still under 1500 chars, log a warning (don't loop, but flag it)

### Changes summary

| File | Change |
|---|---|
| `supabase/functions/generate-material/index.ts` line ~272-274 | Fix list padding from 0.16in → 0.3in, add icon bullet rules |
| `supabase/functions/generate-material/index.ts` line ~1079 | Add `LAYOUT BALANCE & PROFESSIONAL POLISH` section to system prompt |
| `supabase/functions/generate-material/index.ts` line ~432-468 | Add checks 11 (holistic balance), 12 (alignment), 13 (page fill) to review prompt |
| `supabase/functions/generate-material/index.ts` line ~1223 | Tighten sparse threshold from 1500 → 1800 chars |

### What stays the same
- Style family system unchanged
- Variability mid-generation check unchanged
- Condensation/expansion pass logic unchanged (just threshold tweak)
- No database changes
- No client-side changes

