

## Comprehensive Multi-Role Code Review & Improvement Plan

This plan addresses findings from a Senior Architect, Senior Software Engineer, and Senior QA Engineer review of the full ResuVibe codebase.

---

### Critical Findings Summary

| Priority | Category | Issue | Impact |
|----------|----------|-------|--------|
| P0 | Security | `dangerouslySetInnerHTML` on cover letter editor (line 1005, ApplicationDetail.tsx) with user-editable content | XSS vector |
| P0 | Security | `getJobApplications()` fetches `SELECT *` including all HTML blobs for list view | Bandwidth/perf, potential data leak |
| P0 | Resilience | `backgroundGenerator` is a client-side singleton — browser tab close kills all in-flight generation | Data loss |
| P1 | Architecture | ApplicationDetail.tsx is 1,377 lines with 25+ useState hooks — monolith page component | Maintainability |
| P1 | Type Safety | 50+ instances of `any` type across pages — no typed models for core entities | Bug risk |
| P1 | QA | Zero test coverage — only 1 placeholder test exists | Regression risk |
| P2 | Performance | Applications list polls on backgroundGenerator subscribe with full reload | Excessive re-renders |
| P2 | Memory | `useInactivityLogout` adds 5 global event listeners but `resetTimers` recreates on every interaction | Timer churn |
| P2 | Edge Cases | Cover letter print opens `window.open` which may be blocked by popup blockers | Silent failure |

---

### Step 1: Architect Review — Changes

#### 1a. Column Projection for List Queries
**File:** `src/lib/api/jobApplication.ts`
- `getJobApplications()` currently does `SELECT *` — fetches resume_html, dashboard_html, cover_letter (potentially 500KB+ per row)
- Change to select only list-view columns: `id, company_name, job_title, status, generation_status, generation_error, company_url, company_icon_url, cover_letter, dashboard_html, created_at, updated_at`
- For cover_letter and dashboard_html, only select a boolean indicator (use `.select('id, ..., cover_letter.is.not.null')` pattern or keep minimal fields)

#### 1b. Background Generator Resilience
**File:** `src/lib/backgroundGenerator.ts`
- Add `generation_status` DB polling fallback: if the user refreshes/closes tab, the ApplicationDetail page already polls the DB status — this is adequate
- Add `beforeunload` warning when jobs are active to prevent accidental tab close
- No server-side orchestration needed (Deno edge functions are stateless), but document this limitation

#### 1c. Rate Limiting on Edge Functions
- All 17 edge functions have rate limiting removed per user decision — document this as an accepted risk
- Add request-level input validation (max body size checks) in the shared aiRetry utility

---

### Step 2: Software Engineer Review — Changes

#### 2a. Decompose ApplicationDetail.tsx (1,377 lines → ~5 focused files)
Create extraction hooks and sub-components:

| New File | Extracted From | Purpose |
|----------|---------------|---------|
| `src/hooks/useApplicationDetail.ts` | Lines 112-340 | All state, data fetching, save logic |
| `src/hooks/useCoverLetterEditor.ts` | Lines 346-427 | Cover letter regen, vibe edit |
| `src/hooks/useDashboardEditor.ts` | Lines 429-537 | Dashboard regen, chat, refinement |
| `src/hooks/useResumeEditor.ts` | Lines 199-249 | Resume regen dialog logic |
| `src/components/ResumeTab.tsx` | Lines 644-891 | Resume tab JSX |
| `src/components/CoverLetterTab.tsx` | Lines 893-1042 | Cover letter tab JSX |
| `src/components/JDAnalysisTab.tsx` | Lines 1044-1186 | JD analysis tab JSX |
| `src/components/DetailsTab.tsx` | Lines 1226-1339 | Details tab JSX |

ApplicationDetail.tsx becomes a thin orchestrator (~150 lines).

#### 2b. Typed Models (eliminate `any`)
**New file:** `src/types/models.ts`
- Define `JobApplication`, `UserProfile`, `UserResume`, `GeneratedAsset` interfaces derived from the Supabase types
- Replace all `useState<any>` with typed state across pages

#### 2c. Fix XSS in Cover Letter Editor
**File:** `src/pages/ApplicationDetail.tsx` (line 1005)
- Replace `dangerouslySetInnerHTML={{ __html: coverLetter.replace(/\n/g, "<br>") }}` with a safe approach:
  - Use a `<pre>` or `<div>` with `white-space: pre-wrap` and set `textContent` via ref, or
  - Sanitize with DOMPurify before injection

#### 2d. Fix Applications List Performance
**File:** `src/pages/Applications.tsx`
- The `backgroundGenerator.subscribe()` triggers full `loadApplications()` on every status change — debounce this or use targeted row updates
- Add column projection to `getJobApplications()`

#### 2e. Clean Up Minor Issues
- `Profile.tsx` uses `if (profile && !initialized)` pattern inside render — move to `useEffect`
- Cover letter PDF via `window.open` — add fallback with iframe print (same pattern as resume)
- `Onboarding.tsx` step navigation has no validation (user can click Next without filling required fields)

---

### Step 3: QA Engineer Review — Changes

#### 3a. Core Unit Tests
Create test files for critical business logic (no UI rendering needed):

| Test File | Tests |
|-----------|-------|
| `src/lib/dashboard/assembler.test.ts` | `parseLlmJsonOutput` with valid JSON, malformed JSON, markdown fences, trailing commas |
| `src/lib/keywordMatcher.test.ts` | Keyword extraction, matching, gap analysis |
| `src/lib/fractionalIndex.test.ts` | Lexical ordering edge cases |
| `src/lib/atsFormatCheck.test.ts` | ATS format validation rules |
| `src/hooks/useAuth.test.ts` | Session refresh logic, sign-out cleanup |

#### 3b. Component Tests
| Test File | Tests |
|-----------|-------|
| `src/pages/Login.test.tsx` | Email validation, form submission, Google OAuth trigger, forgot password flow |
| `src/components/GenerationProgressBar.test.tsx` | Stage transitions, error state rendering |
| `src/pages/Applications.test.tsx` | Empty state, sort toggling, delete confirmation dialog |

#### 3c. Edge Case Hardening
- `ApplicationDetail.tsx`: Add guard for `app.job_url` being undefined in `saveField` calls (currently assumed non-null)
- `backgroundGenerator.ts`: Add try/catch around the `saveJobApplication` in the finally blocks (lines 509-516) — if this fails the error is silently swallowed
- `processSSEStream`: Handle case where stream terminates mid-JSON line (currently swallows parse errors silently)

#### 3d. Error Boundary
- Add React Error Boundary wrapper around `AuthenticatedApp` to catch rendering crashes and show recovery UI instead of white screen

---

### Implementation Order

1. **Security fixes** (XSS, column projection) — immediate
2. **Type models + ApplicationDetail decomposition** — largest refactor, highest maintainability impact  
3. **Error boundary + edge case hardening** — resilience
4. **Test suite** — 8-10 test files covering core logic
5. **Performance fixes** (debounce, beforeunload) — polish

### What Will NOT Change
- Resume generation prompts and cover letter prompts (excluded per prior instruction)
- Dashboard rendering engine (recently updated with P2 feedback)
- Edge function architecture (Deno functions are appropriate for this scale)
- Authentication flow (already robust with session recovery)

