

## Plan: Incorporate P1 Cross-Asset Feedback into Generation Prompts

### Summary
Add specific P1 feedback rules (arrow routing, one-page PDF enforcement, rendering artifact prevention) to the system prompts in the three dedicated edge functions: `generate-architecture-diagram`, `generate-roadmap`, and `generate-raid-log`. These functions currently have minimal prompts compared to `generate-material`'s sophisticated constraints.

### Feedback Being Applied

**P1 — Architecture Diagrams (from 8 reviews):**
- Arrows must connect to card **edges** (right-side out, left/top/bottom in — whichever edge is closest)
- Arrows must route **around** cards, never through them
- No large decorative shapes (triangles, background overlays) covering content
- Legend must be compact and inline, not floating/overlapping
- One-page PDF constraint — not interactive/multi-page

**P1 — All Three Functions (cross-cutting):**
- Enforce single US Letter page (8.5×11in) with proper CSS (`@page`, fixed body dimensions, `overflow: hidden` on body only)
- No `overflow: hidden` on text containers, no fixed heights on content divs
- No `position: absolute/fixed` on content elements
- Include `company_name` and candidate context in header
- Use the `page-shell` / `page-content` wrapper pattern from `generate-material`

### Changes

#### 1. `supabase/functions/generate-architecture-diagram/index.ts`
- Add arrow routing rules to system prompt: connect to edges, route around cards, no crossing
- Add one-page layout constraints (CSS rules, page structure)
- Ban large decorative shapes and floating legends
- Add the `enforceOnePageLayout`-style wrapper or inline equivalent CSS rules in the prompt
- Keep SVG-based approach but with strict arrow/connector discipline

#### 2. `supabase/functions/generate-roadmap/index.ts`
- Add one-page layout constraints to system prompt
- Add CSS safety rules (no overflow:hidden on text, no absolute positioning, no fixed heights)
- Add content brevity rules (max 3-4 initiatives per phase instead of 5-8, max 3-4 bullet points)
- Add the page wrapper structure requirement
- Reduce content density to fit single page reliably

#### 3. `supabase/functions/generate-raid-log/index.ts`
- Add one-page layout constraints to system prompt
- Reduce table rows from 5-8 per section to 3-4 per section (4 sections × 3-4 rows = 12-16 rows fits one page)
- Add CSS safety rules
- Add alternating row shading (preserving successful pattern from reviews)
- Add the page wrapper structure requirement

### What Will NOT Change
- Resume and cover letter generation prompts — explicitly excluded per user instruction
- Dashboard generation — feedback applied separately per user instruction
- `generate-material/index.ts` — already has these constraints built in

### Technical Details
Each function gets a shared block of CSS/layout rules injected into its system prompt, plus function-specific content density limits. The post-processing HTML cleanup (markdown fence stripping, HTML boundary detection) already exists in all three functions and will be preserved.

