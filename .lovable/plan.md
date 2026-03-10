# JobBot Maui Plan — Architect-Reviewed Rewrite

Based on competitive landscape analysis, product critique, and a critical architect review that identified 17 gaps across data model design, error handling, performance, security, and testing strategy.

---

## Feature Priority Matrix

| # | Update | Priority | Effort | Status |
|---|--------|----------|--------|--------|
| 1 | Subscription Infrastructure | CRITICAL | 1–2 weeks | ✅ DONE |
| 2 | Public Landing Page | CRITICAL | 3–5 days | ✅ DONE |
| 3 | ATS Match Score | HIGH | 3–5 days | 🔲 TODO |
| 4 | Pipeline Stages (Kanban) | HIGH | 5–7 days | 🔲 TODO |
| 5 | DOCX Export | HIGH | 2–3 days | 🔲 TODO |
| 6 | Mobile Responsive UI | MEDIUM | 5–7 days | 🔲 TODO |
| 7 | Selective Asset Generation | MEDIUM | 3–4 days | 🔲 TODO |
| 8 | Onboarding Flow | MEDIUM | 3–4 days | 🔲 TODO |
| 9 | Code Cleanup | LOW | 3–4 days | 🔲 TODO |
| 10 | Chrome Extension (Infra) | LOW | 2–3 days | 🔲 TODO |

---

## Phased Schedule

### Phase 1 — Launch-Blocking (COMPLETE)
- ✅ Subscription Infrastructure: 3-tier model, feature gating, rate limiting
- ✅ Public Landing Page: Hero, features, pricing, CTA

### Phase 2 — Competitive Parity
Items 3–5. Close visible feature gaps vs Teal, Rezi, Swooped.

### Phase 3 — Retention & Polish
Items 6–8. Mobile support, faster generation, onboarding.

### Phase 4 — Maintenance & Future
Items 9–10. Tech debt cleanup, Chrome extension infra.

---

## Feature 1: ATS Match Score

### Database
```sql
ALTER TABLE job_applications
  ADD COLUMN ats_score jsonb DEFAULT NULL,
  ADD COLUMN ats_scored_at timestamptz DEFAULT NULL;
```
Add `ats_score` and `ats_scored_at` to `ALLOWED_JOB_APP_FIELDS`.

### Edge Function: `score-ats-match/index.ts`
- Input: `{ jobDescription, resumeHtml }`
- Model: `google/gemini-2.5-flash` with tool-calling for structured output
- Output schema:
  ```json
  {
    "score": 78,
    "matchedKeywords": ["React", "TypeScript"],
    "missingKeywords": ["Kubernetes", "Terraform"],
    "suggestions": ["Add cloud infrastructure experience"],
    "keywordGroups": { "React": ["React", "React.js", "ReactJS"] }
  }
  ```
- Keyword grouping: prompt instructs model to cluster synonyms
- Score calibration rubric: 0–30 poor, 31–60 partial, 61–80 strong, 81–100 near-perfect

### Caching & Invalidation
- Store in `ats_score` column with `ats_scored_at` timestamp
- Re-score only when: (a) user clicks "Rescan", (b) `resume_html` changes (hash comparison), (c) score > 7 days old
- Tier gating: Free = 2 scores/day, Pro = 20/day, Premium = unlimited

### UI: `AtsScoreCard.tsx`
- Circular gauge (0–100), color-coded (red < 50, yellow 50–79, green 80+)
- Expandable keyword panel with matched/missing lists
- "Rescan" button with cooldown indicator
- Placed in ApplicationDetail header

### Auto-trigger
After resume generation completes in `backgroundGenerator.ts`, queue ATS scoring as non-blocking follow-up step.

### Acceptance Criteria
- Score latency < 5s for 95th percentile
- Score variance ≤ ±5 points on identical inputs across 10 runs
- Free tier enforces 2/day limit with upgrade gate

---

## Feature 2: Application Pipeline Stages (Kanban)

### Database
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

### Stage Definitions (`src/lib/pipelineStages.ts`)
```
bookmarked → applied → interviewing → offer → accepted
                                    ↘ rejected
```
- All transitions allowed but "illogical" moves show confirmation dialog
- `updatePipelineStage()` writes to both `job_applications` and `pipeline_stage_history`

### UI: `KanbanBoard.tsx`
- Uses `@hello-pangea/dnd` (maintained fork, touch support built-in)
- Cards: company icon, role, days-in-stage badge, ATS score mini-badge
- View toggle in `Applications.tsx` header: List (default) | Kanban
- Stage dropdown in `ApplicationDetail.tsx` header
- Mobile: horizontal scroll with CSS snap

### Accessibility
- Keyboard navigation: arrow keys between columns, Enter to drop
- ARIA labels on all drag handles
- Screen reader announcements for stage changes

---

## Feature 3: DOCX Export

### Edge Function: `export-docx/index.ts`
- Uses `docx` npm package via Deno npm: specifier
- Input: `{ html, assetType, filename }`
- Output: binary blob, `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Limits: max 500KB input HTML, 60s timeout, graceful error on oversized input

### Client: `src/lib/docxExport.ts`
- `downloadAsDocx(html, filename)` — calls edge function, triggers blob download
- Naming: `{asset-type}-{company}-{role}.docx`

### UI
- DOCX button alongside PDF in `HtmlAssetTab.tsx` for resume and cover letter only
- `FileDown` icon with "DOCX" label
- Tier gating: Free = PDF only, Pro/Premium = PDF + DOCX (upgrade gate for Free)

---

## Feature 4: Mobile Responsive UI

### Breakpoint Strategy
| Breakpoint | Layout |
|---|---|
| `< 640px` (sm) | Single column, card layouts, hamburger nav, full-width inputs |
| `640–1024px` (md) | Two-column where appropriate, condensed table |
| `> 1024px` (lg) | Current desktop layout unchanged |

### Component Changes
| Component | Mobile behavior |
|---|---|
| `AppHeader` | Hamburger → `Sheet` drawer with nav links, theme toggle, sign out |
| `Applications` table | Card list with company icon, role, status badge |
| `ApplicationDetail` tabs | Horizontal scrollable tab bar, full-width iframe at 50vh |
| `NewApplication` form | Single column, sticky "Generate" CTA at bottom |
| `KanbanBoard` | Horizontal scroll with snap, sticky column headers |
| `WysiwygEditor` | Simplified toolbar, larger touch targets |
| `Profile` | Fix card padding |

### Touch Audit
- Asset preview iframes: `touch-action: pan-x pan-y` for pinch-to-zoom
- Kanban: handled by `@hello-pangea/dnd` touch support
- Disable hover-only interactions; add explicit tap targets

### Accessibility
- All new interactive elements get `aria-label`, keyboard-focusable, visible focus rings

---

## Feature 5: Selective Asset Generation

### Database
```sql
ALTER TABLE job_applications
  ADD COLUMN selected_assets jsonb DEFAULT NULL;
```
Add `selected_assets` to `ALLOWED_JOB_APP_FIELDS`.

### UI: `AssetSelector.tsx`
- Checkbox grid in `NewApplication.tsx` before generation starts
- Default selections per tier: Free = resume + cover_letter (locked), Pro = all core, Premium = all + dynamic
- "Essentials Only" / "All Assets" quick buttons
- Locked assets show tier badge + tooltip → pricing page
- Selection persisted to `selected_assets` column

### Pipeline Changes (`backgroundGenerator.ts`)
- `startFullGeneration()` accepts `selectedAssets?: string[]`
- `runPipeline()` filters parallel generation array based on selection
- `totalAssets` calculated dynamically from selected count
- Cover letter always generated (foundational)
- Backward compat: null/undefined `selectedAssets` → generate all

---

## Feature 6: Onboarding Flow

### Database
```sql
ALTER TABLE profiles
  ADD COLUMN onboarding_completed_at timestamptz DEFAULT NULL;
```

### UI: `src/components/onboarding/OnboardingWizard.tsx`
- Full-screen modal, 4 steps:
  1. **Welcome** — brand intro, value prop
  2. **Profile basics** — first name, last name, experience level
  3. **Resume upload** — drag-and-drop, auto-extract skills via `extract-style-signals`
  4. **First application** — paste job URL, CTA to start

### Behavior
- Progress dots, skip button on every step, animated transitions
- Each step saves incrementally to `profiles` table
- Completion: set `onboarding_completed_at`, navigate to `/applications/new`
- Show conditions: authenticated AND `onboarding_completed_at IS NULL` AND 0 applications
- Re-access: Help menu → "Restart Onboarding"

---

## Feature 7: Code Cleanup

### Phase 7a — Baseline tests BEFORE extraction
Render `Profile.tsx`, `NewApplication.tsx`, `Applications.tsx` with mocked data → capture DOM snapshots as regression safety net.

### Phase 7b — Extract components

| Source | Extracted components |
|---|---|
| `Profile.tsx` (746 lines) | `IdentityCard`, `ResumeCard`, `SkillsCard`, `ToneCard`, `useProfileForm` hook |
| `NewApplication.tsx` (787 lines) | `JobInputStep`, `AnalyzingStep`, `PreviewStep`, `useNewApplication` hook |
| `Applications.tsx` (724 lines) | `ApplicationsTable`, `TrashTab`, `DashboardPreviewOverlay` |

### Phase 7c — Remove `as any` casts
- Audit all files, replace with proper types from `types.ts`
- For tables not in generated types, add manual type interfaces

---

## Feature 8: Chrome Extension (Infrastructure Only)

### Edge Function: `import-job-external/index.ts`
- Input: `{ source, url, jobTitle?, companyName?, jobDescription? }`
- Requires valid JWT (verify_jwt = true)
- Rate limited: 10 imports/hour per user
- CORS restricted to app domain only
- Creates `job_applications` row with `pipeline_stage = 'bookmarked'`

### Import Page: `/import` route
- Parses `?url=...&source=linkedin` query params
- Confirmation card before creating application
- Redirects to application detail on success

### Documentation: `docs/CHROME_EXTENSION.md`

---

## Cross-Cutting Requirements

### Analytics Events
Every feature ships with `trackEvent()`:
`ats_score_generated`, `pipeline_stage_changed`, `docx_exported`, `asset_selection_changed`, `onboarding_step_completed`, `kanban_view_toggled`, `import_job_external`

### Error Handling
All edge functions return `{ error: string, code: string }`. Client-side toast for user-facing errors.

### Accessibility
WCAG 2.1 AA for all new components.

---

## Test Suite: Maui Tests

```
src/test/maui/
  fixtures/          — shared mock data
  atsScore.test.ts
  kanbanBoard.test.ts
  docxExport.test.ts
  mobileResponsive.test.ts
  assetSelector.test.ts
  onboardingWizard.test.ts
  codeCleanup.test.ts
  externalImport.test.ts
```

All tests use Vitest + React Testing Library. Run via `vitest --dir src/test/maui`.
