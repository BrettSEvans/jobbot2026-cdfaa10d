

# Critical Architect Review: Maui Plan Gap Analysis & Rewrite

## Executive Summary

As a lead architect evaluating this product for acquisition, the Maui Plan has strong feature prioritization but contains significant gaps in **data model design, error handling, performance, security, testing strategy, and operational readiness**. Below is the gap analysis followed by a rewritten plan.

---

## Gap Analysis

### 1. ATS Match Score — 4 Critical Gaps

**G1.1 — No caching or invalidation strategy.** The plan calls the AI model on every resume view. ATS scoring is expensive. There is no mention of when to invalidate (resume edited? JD changed?). A user who refines their resume 10 times will burn 10 AI calls with no delta tracking.

**G1.2 — No normalization or calibration.** LLMs produce inconsistent scores across runs. A "78" today might be "65" tomorrow for the same inputs. The plan has no score normalization, no benchmark corpus, and no prompt engineering for consistency.

**G1.3 — No keyword taxonomy.** "React" vs "React.js" vs "ReactJS" are the same skill. The plan treats keywords as raw strings with no deduplication or synonym mapping.

**G1.4 — Missing subscription gating.** The plan doesn't specify which tier gets ATS scoring. Free users running unlimited AI scoring calls will blow through rate limits and AI credits.

### 2. Kanban Pipeline — 3 Critical Gaps

**G2.1 — No stage transition validation.** Users can drag from "Offer" back to "Bookmarked" or from "Rejected" to "Accepted." There's no state machine to enforce valid transitions or at least warn on illogical ones.

**G2.2 — No timestamps per stage.** The plan adds a single `pipeline_stage` column but no `stage_changed_at` or stage history table. Without this, "days in stage" is impossible to calculate, and funnel analytics (time-to-offer, rejection rate) are blocked forever.

**G2.3 — Native HTML5 DnD is unreliable.** The plan explicitly avoids a DnD library, but native HTML5 drag events have well-documented issues: no touch support on mobile (contradicts Item 6), ghost image bugs in Safari, and no auto-scroll when dragging near container edges.

### 3. DOCX Export — 2 Critical Gaps

**G3.1 — No DOCX library specified.** The plan says "build OOXML via string templates" in an edge function. OOXML is a ZIP of XML files with complex relationships. Hand-building it is fragile and will produce files that fail validation in strict ATS parsers. Need a real library (e.g., `docx` npm package in Deno).

**G3.2 — No file size or complexity limits.** A resume with embedded images or complex tables could produce a multi-MB DOCX. Edge functions have a 150MB memory limit and 60s timeout. No mention of graceful degradation.

### 4. Mobile Responsive — 2 Critical Gaps

**G4.1 — No breakpoint strategy documented.** "Tailwind responsive utilities" is not a plan. Which breakpoints? What layout changes at each? How do 356-line ApplicationDetail tabs behave on 320px screens?

**G4.2 — No touch interaction audit.** The asset preview iframes, the WYSIWYG editor, the dashboard HTML preview — these all use mouse-centric interactions. The plan doesn't address pinch-to-zoom, touch scrolling inside iframes, or the Kanban drag-drop on touch devices.

### 5. Selective Asset Generation — 2 Critical Gaps

**G5.1 — No persistence of selection.** If a user selects assets, starts generation, and the page reloads, the selection is lost. The `selectedAssets` param is in-memory only with no DB column.

**G5.2 — No impact analysis on existing pipeline.** The `backgroundGenerator.runPipeline()` currently hardcodes 5 parallel assets with `totalAssets = 5` and a counter. Changing this to dynamic count affects the progress bar, the `parallelCompleted/parallelTotal` tracking, and the "generating-assets" status. The plan doesn't address backward compatibility with in-flight jobs.

### 6. Onboarding Flow — 2 Critical Gaps

**G6.1 — localStorage is the wrong persistence layer.** If a user signs up on their phone and later opens the app on desktop, they see onboarding again. Onboarding completion should be stored in the `profiles` table.

**G6.2 — No resume parsing on upload.** The plan mentions "Resume upload" in step 3 but doesn't extract skills, experience, or contact info from the uploaded PDF. This is the single highest-value onboarding action — auto-populating the profile from the resume.

### 7. Code Cleanup — 1 Critical Gap

**G7.1 — No regression safety net.** Decomposing 3 files totaling 2,257 lines with zero existing test coverage is high-risk. The plan says "snapshot/render tests" but doesn't specify what constitutes a passing snapshot for a 787-line page with 15+ state variables.

### 8. Chrome Extension — 1 Critical Gap

**G8.1 — Security: open import endpoint.** The plan creates an edge function `import-job-external` that accepts external data. Without CORS restrictions, CSRF protection, and rate limiting, this is an open attack vector for data injection.

### Cross-Cutting Gaps

**GX.1 — No error budget or SLA.** The plan has no success criteria. What does "done" look like for ATS scoring? 90% accuracy? < 5s latency? No acceptance criteria means no way to evaluate completion.

**GX.2 — No analytics instrumentation.** None of the 8 features include event tracking. Without analytics, you cannot measure adoption, identify drop-off points, or validate that features actually improve retention.

**GX.3 — No accessibility audit.** Kanban drag-drop, onboarding modals, and mobile hamburger menus all have WCAG implications. Zero mention of keyboard navigation, screen readers, or ARIA attributes.

**GX.4 — Test strategy is hollow.** "Maui Tests" are described as unit tests with mocked Supabase calls. There are no integration tests, no E2E tests, and no test data fixtures. The test files described test component rendering but not actual user flows.

---

## Rewritten Maui Plan

### Feature 1: ATS Match Score

**Database:**
```sql
ALTER TABLE job_applications
  ADD COLUMN ats_score jsonb DEFAULT NULL,
  ADD COLUMN ats_scored_at timestamptz DEFAULT NULL;
```
Add `ats_score` and `ats_scored_at` to `ALLOWED_JOB_APP_FIELDS`.

**Edge function:** `score-ats-match/index.ts`
- Input: `{ jobDescription, resumeHtml }`
- Model: `google/gemini-2.5-flash` with tool-calling for structured output
- Output schema: `{ score: number, matchedKeywords: string[], missingKeywords: string[], suggestions: string[], keywordGroups: Record<string, string[]> }`
- Keyword grouping: prompt instructs model to cluster synonyms (e.g., group "React", "React.js", "ReactJS")
- Score calibration: prompt includes a rubric (0-30 = poor keyword match, 31-60 = partial, 61-80 = strong, 81-100 = near-perfect)

**Caching & invalidation:**
- Store result in `ats_score` column with `ats_scored_at` timestamp
- Re-score only when: (a) user clicks "Rescan", (b) resume_html changes (detected via hash comparison), or (c) score is older than 7 days
- Tier gating: Free = 2 scores/day, Pro = 20/day, Premium = unlimited

**UI:** `AtsScoreCard.tsx` — circular gauge, color-coded, expandable keyword panel. Placed in ApplicationDetail header. "Rescan" button with cooldown indicator.

**Auto-trigger:** After resume generation completes in `backgroundGenerator.ts`, queue ATS scoring as a follow-up step (not blocking).

**Tests:**
- Score parsing with edge cases (score=0, score=100, malformed JSON fallback)
- Cache invalidation logic (resume changed → rescore, resume unchanged → use cache)
- Tier rate limiting (free user exceeds 2/day → gate shown)
- Component rendering at each color threshold

### Feature 2: Application Pipeline Stages (Kanban)

**Database:**
```sql
ALTER TABLE job_applications
  ADD COLUMN pipeline_stage text NOT NULL DEFAULT 'applied',
  ADD COLUMN stage_changed_at timestamptz DEFAULT now();

CREATE TABLE pipeline_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE pipeline_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own stage history"
  ON pipeline_stage_history FOR ALL
  USING (user_id = auth.uid());
```
Add `pipeline_stage` and `stage_changed_at` to `ALLOWED_JOB_APP_FIELDS`.

**Stage definitions** (`src/lib/pipelineStages.ts`):
```text
bookmarked → applied → interviewing → offer → accepted
                                    ↘ rejected
```
- All transitions allowed (no hard blocks) but "illogical" moves (e.g., accepted → bookmarked) show a confirmation dialog
- `updatePipelineStage()` writes to both `job_applications` and `pipeline_stage_history`

**UI:**
- `KanbanBoard.tsx`: Uses `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd, already supports touch). Cards show: company icon, role, days-in-stage badge, ATS score mini-badge
- View toggle in `Applications.tsx` header: List (default) | Kanban
- Stage dropdown in `ApplicationDetail.tsx` header
- Mobile: horizontal scroll with CSS snap, cards stacked vertically per column

**Tests:**
- Stage transition writes to history table
- Kanban renders correct cards per column
- "Illogical" transition shows confirmation
- Days-in-stage calculation from `stage_changed_at`

### Feature 3: DOCX Export

**Edge function:** `export-docx/index.ts`
- Uses `docx` npm package (available in Deno via npm: specifier)
- Input: `{ html, assetType, filename }`
- Converts HTML to DOCX paragraphs via DOM parsing (html-to-docx approach)
- Output: binary blob with `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Limits: max 500KB input HTML, 60s timeout

**Client:** `src/lib/docxExport.ts`
- `downloadAsDocx(html, filename)` — calls edge function, triggers blob download
- Naming: `{asset-type}-{company}-{role}.docx`

**UI:** DOCX button appears alongside PDF in `HtmlAssetTab.tsx` for resume and cover letter only. Uses `FileDown` icon with "DOCX" label.

**Tier gating:** Free = PDF only, Pro/Premium = PDF + DOCX.

**Tests:**
- Edge function returns valid content-type
- Filename builder produces correct names
- DOCX button renders for resume/cover-letter, hidden for dashboard
- Free tier sees upgrade gate instead of DOCX button

### Feature 4: Mobile Responsive UI

**Breakpoint strategy:**
- `< 640px` (sm): Single column, card layouts replace tables, hamburger nav, full-width inputs
- `640-1024px` (md): Two-column where appropriate, condensed table
- `> 1024px` (lg): Current desktop layout unchanged

**Component changes:**

| Component | Mobile behavior |
|---|---|
| `AppHeader` | Hamburger → `Sheet` drawer with nav links, theme toggle, sign out |
| `Applications` table | Card list with company icon, role, status badge, swipe-to-delete |
| `ApplicationDetail` tabs | Horizontal scrollable tab bar, full-width iframe at 50vh |
| `NewApplication` form | Single column, sticky "Generate" CTA at bottom |
| `KanbanBoard` | Horizontal scroll with snap, column headers sticky |
| `WysiwygEditor` | Simplified toolbar, larger touch targets |
| `Profile` | Already mostly responsive, fix card padding |

**Touch audit:**
- Asset preview iframes: add pinch-to-zoom via CSS `touch-action: pan-x pan-y`
- Kanban: handled by `@hello-pangea/dnd` touch support
- Disable hover-only interactions; add explicit tap targets

**Accessibility:** All new interactive elements get `aria-label`, keyboard-focusable, visible focus rings.

**Tests:**
- `useIsMobile` returns correct values at breakpoints
- Hamburger menu renders at < 640px, desktop nav at >= 640px
- Card layout replaces table at mobile width

### Feature 5: Selective Asset Generation

**Database:**
```sql
ALTER TABLE job_applications
  ADD COLUMN selected_assets jsonb DEFAULT NULL;
```
Add `selected_assets` to `ALLOWED_JOB_APP_FIELDS`.

**UI:** `AssetSelector.tsx`
- Checkbox grid shown in `NewApplication.tsx` before generation starts
- Default selections per tier: Free = resume + cover_letter (locked), Pro = all core, Premium = all + dynamic
- "Essentials Only" / "All Assets" quick buttons
- Locked assets show tier badge + tooltip → navigate to pricing
- Selection persisted to `selected_assets` column on the job_applications row

**Pipeline changes** (`backgroundGenerator.ts`):
- `startFullGeneration()` accepts `selectedAssets?: string[]`
- `runPipeline()` filters parallel generation array based on selection
- `totalAssets` calculated dynamically from selected count
- Cover letter always generated (it's fast and foundational)
- If no assets selected beyond cover letter, skip parallel phase entirely

**Backward compatibility:** If `selectedAssets` is null/undefined, generate all (existing behavior preserved).

**Tests:**
- Default selection matches tier config
- Deselected assets skipped in pipeline mock
- Progress bar reflects correct total
- Persisted selection survives page reload

### Feature 6: Onboarding Flow

**Database:**
```sql
ALTER TABLE profiles
  ADD COLUMN onboarding_completed_at timestamptz DEFAULT NULL;
```

**UI:** `src/components/onboarding/OnboardingWizard.tsx`
- Full-screen modal, 4 steps:
  1. **Welcome** — brand intro, value prop animation
  2. **Profile basics** — first name, last name, experience level
  3. **Resume upload** — drag-and-drop (reuse `ResumeDropZone`), auto-extract skills via existing `extract-style-signals` function
  4. **First application** — paste a job URL, CTA to start generation
- Progress dots, skip button on every step, animated transitions
- Each step saves incrementally to `profiles` table
- On completion: set `onboarding_completed_at`, navigate to `/applications/new` with pre-filled URL

**Show conditions:** User is authenticated AND `profiles.onboarding_completed_at IS NULL` AND user has 0 applications.

**Re-access:** Help menu → "Restart Onboarding" resets `onboarding_completed_at` to null.

**Tests:**
- Wizard renders for new users (no apps, no onboarding timestamp)
- Wizard does NOT render for returning users
- Step navigation (next/back/skip)
- Profile save fires on each step completion
- Skip sets `onboarding_completed_at` without saving partial data

### Feature 7: Code Cleanup

**Approach:** Decompose incrementally with snapshot tests written BEFORE extraction to establish baselines.

**Phase 7a — Write baseline tests first:**
- Render `Profile.tsx`, `NewApplication.tsx`, `Applications.tsx` with mocked data
- Capture snapshot of DOM structure
- These snapshots become the regression safety net

**Phase 7b — Extract components:**

| Source | Extracted components |
|---|---|
| `Profile.tsx` (746 lines) | `IdentityCard`, `ResumeCard`, `SkillsCard`, `ToneCard`, `useProfileForm` hook |
| `NewApplication.tsx` (787 lines) | `JobInputStep`, `AnalyzingStep`, `PreviewStep`, `useNewApplication` hook |
| `Applications.tsx` (724 lines) | `ApplicationsTable`, `TrashTab`, `DashboardPreviewOverlay` |

**Phase 7c — Remove `as any` casts:**
- Audit all files. Replace with proper types from `src/integrations/supabase/types.ts`
- For tables not in generated types (e.g., `user_subscriptions`), add manual type interfaces until types.ts is regenerated

**Tests:** Snapshot comparison before/after extraction confirms zero visual regression. TypeScript strict mode passes with no `as any` in refactored files.

### Feature 8: Chrome Extension (Infrastructure Only)

**Edge function:** `import-job-external/index.ts`
- Accepts `{ source, url, jobTitle?, companyName?, jobDescription? }`
- Requires valid JWT (no `verify_jwt = false`)
- Rate limited: 10 imports/hour per user
- CORS restricted to app domain only
- Creates a new `job_applications` row with `pipeline_stage = 'bookmarked'`

**Import page:** `/import` route
- Parses `?url=...&source=linkedin` query params
- Shows confirmation card with extracted data before creating application
- Redirects to application detail on success

**Documentation:** `docs/CHROME_EXTENSION.md` with API contract, auth flow, and extension manifest template.

**Tests:**
- Import URL parsing with valid/invalid params
- JWT required (401 without auth)
- Rate limit enforcement
- Application created with correct `pipeline_stage`

---

## Cross-Cutting Requirements (All Features)

**Analytics events:** Every feature ships with `trackEvent()` calls:
- `ats_score_generated`, `pipeline_stage_changed`, `docx_exported`, `asset_selection_changed`, `onboarding_step_completed`, `kanban_view_toggled`, `import_job_external`

**Error handling:** All edge functions return structured errors with `{ error: string, code: string }`. Client-side toast for user-facing errors, console.warn for non-critical failures.

**Accessibility:** WCAG 2.1 AA for all new components. Keyboard navigation for Kanban (arrow keys to move between columns, Enter to drop).

---

## Test Suite Structure

```text
src/test/maui/
  atsScore.test.ts           — score parsing, caching, tier gating, component render
  kanbanBoard.test.ts        — stage transitions, history writes, DnD handler, days-in-stage
  docxExport.test.ts         — filename builder, tier gating, button visibility
  mobileResponsive.test.ts   — breakpoint detection, hamburger render, card layout
  assetSelector.test.ts      — default selection per tier, pipeline filtering, persistence
  onboardingWizard.test.ts   — show conditions, step nav, profile saves, skip behavior
  codeCleanup.test.ts        — baseline snapshots, post-extraction comparison
  externalImport.test.ts     — URL parsing, auth required, rate limiting
  fixtures/                  — shared mock data (job applications, profiles, subscriptions)
```

All tests use Vitest + React Testing Library. Run via `vitest --dir src/test/maui`. Shared fixtures in `fixtures/` prevent test data duplication.

---

## Updated Roadmap Status Table

| # | Update | Priority | Effort | Status |
|---|--------|----------|--------|--------|
| 1 | Subscription Infrastructure | CRITICAL | 1-2 weeks | DONE |
| 2 | Public Landing Page | CRITICAL | 3-5 days | DONE |
| 3 | ATS Match Score | HIGH | 3-5 days | TODO |
| 4 | Pipeline Stages (Kanban) | HIGH | 5-7 days | TODO |
| 5 | DOCX Export | HIGH | 2-3 days | TODO |
| 6 | Mobile Responsive UI | MEDIUM | 5-7 days | TODO |
| 7 | Selective Asset Generation | MEDIUM | 3-4 days | TODO |
| 8 | Onboarding Flow | MEDIUM | 3-4 days | TODO |
| 9 | Code Cleanup | LOW | 3-4 days | TODO |
| 10 | Chrome Extension (Infra) | LOW | 2-3 days | TODO |

Note: Effort estimates increased for items 4, 6, 7, 8, 9 to reflect the gaps identified. Kanban went from 3-5 days to 5-7 due to stage history table, DnD library integration, and touch support. Mobile went up due to touch audit and accessibility requirements.

