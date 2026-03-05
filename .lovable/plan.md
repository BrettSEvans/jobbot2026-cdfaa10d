

# Red Team Codebase Review: Efficiency, Security, and Organization

## Review Team Findings

### PRIORITY 1 — Security (Critical)

**1a. All Edge Functions have `verify_jwt = false`**
Every single edge function in `supabase/config.toml` (22 functions) has JWT verification disabled. While the `streamUtils.ts` client-side code manually passes the auth token, the functions themselves can be called by anyone with the project URL and anon key — no authentication required. The rate-limit check inside some functions (e.g. `refine-resume`) extracts the user from the token but does not reject unauthenticated requests.

**Fix:** Enable `verify_jwt = true` for all functions, or at minimum add explicit auth guards at the top of each function that reject requests without a valid user token. Functions that truly need to be public (none identified) can remain open.

**1b. `updateProfile` accepts arbitrary fields via `as any`**
`updateProfile(updates as any)` passes user-controlled data directly to a Supabase `.update()` call. A crafted request could attempt to set fields like `approval_status` or `email` on the profiles table (though RLS mitigates some risk, the `Users can update own profile` policy allows updating all columns).

**Fix:** Whitelist allowed fields in `updateProfile` before passing to `.update()`. Only permit: `first_name`, `middle_name`, `last_name`, `display_name`, `resume_text`, `years_experience`, `target_industries`, `key_skills`, `preferred_tone`.

**1c. `saveJobApplication` spreads unvalidated input**
`saveJobApplication` does `{ ...app }` directly into insert/update with no field whitelist. Combined with the `as any` cast, any caller could inject unexpected columns.

**Fix:** Define an explicit allowlist of writable fields for `job_applications` and filter before database calls.

---

### PRIORITY 2 — Type Safety (High)

**2a. Pervasive `as any` casts (276 matches across 11 API files)**
Nearly every Supabase query uses `(supabase as any)` to bypass TypeScript's generated types. This means:
- No compile-time checking of table names or column names
- No autocomplete or refactoring safety
- Bugs from misspelled columns are only caught at runtime

**Root cause:** The auto-generated `types.ts` doesn't include all tables (e.g. `user_roles`, `test_users`, `resume_prompt_styles`, `dashboard_templates`, etc.).

**Fix:** Regenerate the Supabase types to include all tables. Then remove every `as any` cast and use properly typed queries. This is a large but mechanical change that eliminates an entire class of bugs.

---

### PRIORITY 3 — Architecture (Medium-High)

**3a. `backgroundGenerator.ts` has a dead method**
`updateJobByKey` (line 690-699) duplicates `updateJob` but is never called. The private `updateJob` method is used everywhere, including for asset jobs where the key is `appId::assetType` — so the key-based variant was likely intended but never wired up.

**Fix:** Remove `updateJobByKey` or replace `updateJob` calls in `runAssetJob` with it if the key-based lookup was intended.

**3b. `NewApplication.tsx` duplicates the generation pipeline**
The `handleAnalyze` function (lines 116-290) contains a full copy of the generation pipeline that also exists in `backgroundGenerator.ts`. The inline version does NOT run in the background — if the user navigates away during generation, work is lost.

**Fix:** Remove the inline pipeline from `NewApplication.tsx` and route all generation through `backgroundGenerator.startFullGeneration()`. The page already imports `backgroundGenerator`.

**3c. `BackgroundJobsBanner` rendered outside `BrowserRouter`**
In `App.tsx` line 110, `BackgroundJobsBanner` is rendered outside the `BrowserRouter`, meaning it cannot use routing hooks (`useNavigate`, `useLocation`). If it needs navigation (e.g. clicking a job to go to its detail page), it will crash.

**Fix:** Move `BackgroundJobsBanner` inside the `BrowserRouter`.

---

### PRIORITY 4 — Data Integrity (Medium)

**4a. Resume deletion race condition**
In `deleteResume`, after deleting the DB record, the function queries for the most recent remaining resume to set as active. Between the delete and the query, another concurrent operation could change state. The `set_active_resume` function is SECURITY DEFINER but the fallback logic in `deleteResume` is not atomic.

**Fix:** Create a `delete_and_reassign_resume` database function that handles deletion + reassignment atomically in a single transaction.

**4b. No file size validation on edge functions**
The client validates 5MB max for resume uploads, but the storage bucket has no server-side size limit configured. A malicious client could bypass the client check and upload arbitrarily large files.

**Fix:** Configure a file size limit on the `resume-uploads` bucket (e.g. 10MB as a safety margin).

---

### PRIORITY 5 — Code Organization (Medium)

**5a. Inconsistent Supabase query patterns**
Some files use `supabase.functions.invoke()` (correct), others use raw `fetch()` with manually constructed URLs (in `streamUtils.ts`). The raw fetch is needed for SSE streaming (which `invoke()` doesn't support), but the auth header construction duplicates logic.

**Fix:** Centralize the auth-header construction into a shared utility. Document why `fetch` is used for SSE endpoints vs `invoke` for JSON endpoints.

**5b. Profile page is 746 lines**
`Profile.tsx` handles identity, resume uploads, skills, tone, style preferences, test user management, and admin features all in one file.

**Fix:** Extract the resume file manager into a `ResumeFileManager` component, and the skills/industries tag editor into a `TagEditor` component.

---

### PRIORITY 6 — QA / Testing Gaps (Medium)

**6a. No tests for resume CRUD operations**
The new `listUserResumes`, `deleteResume`, `renameResume`, `setActiveResume`, and `uploadResumePdf` functions have zero test coverage.

**Fix:** Add unit tests for the resume API functions, particularly the deletion-with-reassignment logic.

**6b. No error boundary in the app**
If any component throws during render, the entire app crashes with a white screen. There is no React error boundary.

**Fix:** Add a top-level `ErrorBoundary` component that catches render errors and shows a recovery UI.

---

## Recommended Implementation Order

| # | Issue | Risk | Effort | 
|---|-------|------|--------|
| 1 | Edge function auth guards (`verify_jwt` / explicit guards) | Critical security | Medium |
| 2 | Whitelist fields in `updateProfile` and `saveJobApplication` | High security | Low |
| 3 | Regenerate Supabase types, remove `as any` casts | High reliability | Medium-Large |
| 4 | Remove duplicated pipeline in `NewApplication.tsx` | Medium (data loss) | Medium |
| 5 | Move `BackgroundJobsBanner` inside `BrowserRouter` | Low-Medium | Trivial |
| 6 | Extract Profile page subcomponents | Low (maintainability) | Medium |
| 7 | Add error boundary | Low-Medium | Low |
| 8 | Add resume API tests | Low (quality) | Low-Medium |
| 9 | Atomic resume deletion function | Low (edge case) | Low |
| 10 | Storage bucket size limits | Low | Trivial |

