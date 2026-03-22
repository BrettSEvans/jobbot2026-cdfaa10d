
Goal: permanently eliminate hidden/clipped text in generated materials, including the Veeam M&A Integration Blueprint/Roadmap, instead of relying on the current AI review to “guess” that layout is safe.

What I found
- The main regression is in `supabase/functions/generate-material/index.ts`: the one-page guard forcibly applies `overflow: hidden !important` to `html`, `body`, `.page-content`, and effectively every descendant inside `.page-content`.
- That means when content is even slightly taller than its frame, the bottom of lines gets clipped instead of the container growing or the content being reduced.
- The guard also strips positioning very aggressively, which can break intended spacing while still hiding overflow.
- The current review loop can report `REVIEW_PASS` and still miss real clipping because it is AI-only; there is no deterministic post-generation layout audit.
- The preview UI is mostly just scaling the page; it is showing the broken HTML faithfully, not causing the bug.

Implementation plan

1. Replace the clipping-first CSS guard with a flow-safe layout guard
- Update `enforceOnePageLayout()` in `supabase/functions/generate-material/index.ts`.
- Remove blanket `overflow: hidden !important` from all descendants.
- Keep page-level containment on the outer shell only, but let inner sections use `overflow: visible` and `height: auto`.
- Stop forcing every content element to `position: static`; only neutralize truly unsafe `absolute/fixed` content nodes.
- Add safer rules for headers/cards/frames:
  - `min-height` instead of fixed heights
  - explicit padding
  - visible overflow for text containers
  - consistent line-height and margin rules

2. Add deterministic hidden-text detection before accepting output
- In `generate-material`, add a server-side HTML audit pass before final acceptance.
- Inspect generated HTML/CSS for high-risk patterns and fail/retry if found:
  - fixed `height`/`max-height` on text containers
  - `overflow:hidden` on sections containing paragraphs/lists
  - header/banner containers with insufficient padding
  - dense multi-column grids in one-page layouts
- Treat these as hard QA failures, not soft suggestions.

3. Make the 3-pass review loop stricter and stateful
- Keep the 3 chances, but only count a pass if:
  - AI review says `REVIEW_PASS`
  - deterministic audit also passes
- If audit fails, feed the exact violations back into the next repair cycle:
  - hidden text in header
  - hidden text in first text block
  - hidden text in named frames like Technical Discovery, Application Rationalization, Phase 3
- After 3 failed cycles, save as best-effort with explicit QA metadata instead of pretending it is clean.

4. Force simpler templates when density or risk is high
- Tighten fallback logic in `generate-material` so risky assets automatically collapse to safer patterns:
  - single-column brief
  - 60/40 split with short sidebar
  - compact table + bullets
- Ban complex frame-heavy layouts for roadmap/architecture materials when text volume is high.
- Prefer fewer sections and more generic summaries over dense framed content.

5. Persist QA results per generated asset revision
- When a material is regenerated, store review outcome details alongside the revision trail so you can see whether a version was:
  - pass on first try
  - pass after repair
  - failed after 3 cycles
- This makes it possible to trust revision history and spot recurring layout failures instead of only saving raw HTML snapshots.

6. Target the Veeam M&A asset specifically after the engine fix
- Regenerate the Veeam M&A Integration Blueprint/Roadmap using the updated guard + audit pipeline.
- Verify the exact reported failures are blocked:
  - bottom half of header line not clipped
  - first text block fully visible
  - Technical Discovery/Application Rationalization frames fully visible
  - Phase 3 frame fully visible
- If that asset still needs too much content, force a more general one-page pattern instead of squeezing text into framed sections.

Technical details
- Primary file: `supabase/functions/generate-material/index.ts`
- Likely small UI follow-up: optionally surface QA status in the materials revision/history UI so failed best-effort versions are visible to you.
- No backend schema change is strictly required for the core fix, but storing QA metadata may require a small migration if we want first-class status/history fields.

Expected outcome
- Hidden text stops being masked by global overflow rules.
- Materials only pass when both AI review and hard layout checks agree.
- The M&A roadmap and similar one-page assets use safer layouts and shorter content.
- Repeated regeneration becomes more reliable instead of producing different broken variants.
