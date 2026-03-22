
## Plan: Enforce one-page best practices across all materials

### What I found
- The current best-practices research prompt is still too open-ended and asks for “comprehensive” guidance, which encourages verbose output.
- `generate-material` then injects that full `best_practices` text directly into the generation prompt, so overly long research becomes overly long documents.
- The cached `asset_best_practices` records are already populated, so even if generation rules improved, old verbose guidance can keep affecting new runs.
- The review step mainly fixes HTML after generation; it does not strongly reduce content early enough when the design budget is already blown.

## Implementation plan

### 1. Replace verbose best practices with a strict one-page rubric
Update both best-practice generators so they produce compact, structured guidance specifically for one-page printable materials.

Files:
- `supabase/functions/research-asset-best-practices/index.ts`
- `supabase/functions/generate-material/index.ts`

Changes:
- Rewrite the research prompt to require:
  - max 3-4 body sections
  - max content budgets per section
  - preferred simple layouts only
  - banned patterns that cause overlap
  - one-page spacing / footer / header rules
  - concise “do / avoid / content budget / layout pattern” format
- Make winning-pattern extraction prefer:
  - simple section flow
  - short tables / bullets
  - low-complexity layouts
  - no dense dashboards / swimlanes / layered graphics

### 2. Normalize best practices before they reach generation
Do not pass raw long-form research directly into the material prompt.

File:
- `supabase/functions/generate-material/index.ts`

Changes:
- Add a normalization step that compresses cached best practices into a short “generation rubric” such as:
  - allowed layouts
  - maximum sections
  - max bullets / words / rows
  - banned patterns
  - required whitespace and footer reserve
- Pass only that compact rubric into the final generation prompt.

### 3. Add a stricter content-budget system in generation
Strengthen generation so the model writes for the page first, not just the topic.

File:
- `supabase/functions/generate-material/index.ts`

Changes:
- Define explicit page budgets by block type:
  - header budget
  - body section budget
  - optional visual budget
  - footer budget
- Instruct the model to choose a simpler pattern whenever content is dense.
- Reduce allowed verbosity another step beyond the current limits.
- Prefer general, role-relevant phrasing over detailed narrative when space is tight.

### 4. Add a fallback “condense and simplify” retry
If the first result still appears too dense, retry generation with a simplified pattern instead of relying only on HTML repair.

File:
- `supabase/functions/generate-material/index.ts`

Changes:
- After first-pass generation/review, detect risky output signals such as:
  - too many sections
  - too many bullets / rows
  - too much text volume
  - layout types known to overflow
- If detected, run one regeneration pass using a forced simplified template family:
  - clean single-column brief
  - compact two-column 60/40
  - short table + bullets
- Only then run final review/QA.

### 5. Refresh all cached best practices
Backfill the existing `asset_best_practices` rows so all current asset types start using one-page-safe guidance.

Uses existing table:
- `public.asset_best_practices`

Changes:
- Rebuild each cached asset type with the new rubric prompt.
- Keep the same table; no schema change needed.
- This ensures previously cached verbose guidance no longer contaminates future generations.

## Technical notes
- No database schema changes are required.
- The main root cause is prompt/data shape, not storage design.
- The two places that must stay aligned are:
  - `research-asset-best-practices` (cache creation)
  - `generate-material` (cache consumption + final generation)
- The safest direction is to make best practices more general and constraint-driven, not more descriptive.

## Expected outcome
- New and cached best practices will both enforce the one-page standard.
- Materials will use simpler, more reliable layouts.
- Text blocks will be shorter and more general when necessary.
- Overflow, clipping, and frame-collision bugs should drop significantly because the content budget is constrained before HTML is generated.
