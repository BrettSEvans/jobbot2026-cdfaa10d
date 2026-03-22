

## Plan: Enforce simplicity across all materials + collapsible variability card

### Problem
The Cross-Functional M&A Communication Plan Template (and potentially other materials) still generates overly complex designs with too much content. The current density thresholds are too generous (5 sections, 25 bullets, 8 table rows, 4000 chars), allowing dense output to skip condensation. The simplicity rules exist but are not strict enough to prevent verbose, complex layouts across all asset types.

### Changes

#### 1. Tighten density thresholds in `generate-material/index.ts`
Current thresholds allow too much content before triggering condensation:
- Sections: 5 → **4**
- Bullets: 25 → **16**
- Table rows: 8 → **5**
- Text chars: 4000 → **3000**

#### 2. Strengthen the generation system prompt
- Reduce max sections from 4 to **3 body sections** (header + 3 sections + footer)
- Reduce bullet limits: 4-5 → **3-4 per section**
- Reduce paragraph word limits: 70 → **50 words max**
- Add explicit rule: "The document must fill the page but NOT overflow — aim for 80-85% page fill"
- Emphasize: "A clean, well-spaced document with 3 strong sections impresses more than a cramped document with 6 mediocre sections"
- Ban "template" or "plan" style documents from using framed/boxed sections (they cause the most clipping)

#### 3. Tighten the condensation pass instructions
- Target max 3 sections instead of 3-4
- Max 3-4 bullets instead of 4-5
- Max 3-4 table rows instead of 4-5
- Add instruction: "Remove all framed/boxed section containers — use simple headers with underlines instead"

#### 4. Tighten best-practices research rubric
Update the inline research prompt to match the stricter limits:
- Max 3 body sections (not 3-4)
- Max 3-4 bullets per section (not 4-5)
- Max 3-4 table rows (not 4-5)

#### 5. Make DesignVariabilityCard collapsible
Wrap the card content in a `Collapsible` component (already available in the project) so it starts collapsed and can be toggled open.

### Files to modify
- `supabase/functions/generate-material/index.ts` — tighten thresholds, prompts, condensation
- `src/components/admin/DesignVariabilityCard.tsx` — wrap in Collapsible

