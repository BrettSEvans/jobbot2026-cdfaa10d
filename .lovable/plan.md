

# Red Team Review: Architecture & Code Quality Audit

## Executive Summary

The existing plan identifies real issues but **misses the most critical finding**: a security scan reveals that **all 43 RLS policies are RESTRICTIVE-only with zero PERMISSIVE policies**, meaning they are effectively non-functional. PostgreSQL's default with only RESTRICTIVE policies is deny-all, so the app is likely working only because edge functions use the service role key, bypassing RLS entirely. This is a **showstopper** that supersedes every other item in the plan.

---

## New Findings Not in Current Plan

### P0 — ALL RLS POLICIES ARE NON-FUNCTIONAL (Critical Security)

Every policy across all 27 tables uses `RESTRICTIVE` type with no `PERMISSIVE` policies anywhere. In PostgreSQL, RESTRICTIVE policies narrow an already-permitted set — but with no PERMISSIVE policies, the base set is empty. This means:

- Client-side Supabase queries work only if they somehow bypass RLS (service role) or if there's a Supabase-level default that auto-permits authenticated users (there isn't).
- If the app is functioning at all for end users, it's because something is misconfigured in the auth layer, not because RLS is working correctly.
- **When this is fixed**, the `dashboard_templates` table has a `SELECT USING (true)` policy that will expose all user-created templates (including personal job application data) to every authenticated user.

**Fix:** Convert all RESTRICTIVE policies to PERMISSIVE. Then fix the `dashboard_templates` SELECT policy to: `USING (user_id IS NULL OR user_id = auth.uid())`.

**Effort:** Medium (must be done carefully to avoid locking out all users)

### P0 — Leaked Password Protection is Disabled

The security scan confirms leaked password protection (HaveIBeenPwned) is disabled, contradicting the memory note that says it's enabled. This needs to be re-enabled.

**Effort:** 5 minutes via auth configuration

### P1 — `streamUtils.ts` Falls Back to Anon Key When No Session

Line 48: `const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`. If a user's session expires mid-use, edge function calls silently fall back to the anon key, bypassing any user-level auth checks in the function. At scale this means unauthenticated AI generation requests that appear legitimate.

**Fix:** Throw an error if no session exists instead of falling back.

### P1 — `as any` Casts Hide Real Bugs (4 locations)

- `Profile.tsx:75` — `(p as any).master_cover_letter` — field exists in DB but cast hides type mismatch
- `profile.ts:207` — same field, two casts on one line
- `ApplicationDetail.tsx:474` — `(state.app as any)?.design_variability` — field exists in DB but missing from allowed fields list
- `revisionFactory.ts:33` — `supabase as any` for dynamic table access — acceptable but fragile

The `design_variability` and `master_cover_letter` fields exist in the database schema but are missing from `ALLOWED_JOB_APP_FIELDS`, meaning client saves silently strip them.

### P1 — `getJobApplications` Fetches All Columns Including HTML Blobs

Every list view calls `select('*')` which pulls resume_html, dashboard_html, raid_log_html, etc. — potentially 500KB+ per row. With 50 applications, the list page loads 25MB+ of data the user never sees.

**Fix:** Use column projection: `.select('id, job_url, company_name, job_title, pipeline_stage, created_at, generation_status, company_icon_url, ats_score, stage_changed_at, cover_letter, status, generation_error, persona_id, selected_assets, branding')`.

### P1 — Realtime Handler Creates Stale Closures

`useApplicationDetail.ts` line 85: `loadApplication` closes over `editingCoverLetter`, but the realtime `useEffect` (line 128) has `[id]` as its only dependency. When a realtime event fires, it calls `loadApplication` with a stale `editingCoverLetter` value, potentially overwriting user edits.

### P2 — No Layout Component (Fragile Route Definitions)

Every authenticated route in `App.tsx` manually wraps content with `<AppHeader>` + `<main>`. Adding a route without this wrapper silently breaks the layout. This is a maintenance trap.

### P2 — Background Generator Never Cleans Up Map Entries

The `BackgroundGenerationManager` keeps all completed/errored jobs in its `Map` forever. Long sessions with many generations will leak memory.

### P2 — No Pagination (1000-Row Silent Ceiling)

`getJobApplications` has no `.limit()` or `.range()`. Supabase silently caps at 1000 rows.

---

## Assessment of Existing Plan Items

| Plan Item | Verdict |
|-----------|---------|
| Enable JWT verification on edge functions | **Correct but nuanced** — `verify_jwt = false` is actually required for the signing-keys system used by Lovable Cloud. The manual `getClaims()` checks in the function code ARE the correct approach. The real issue is that `analyze-company` checks for a Bearer token but never calls `getClaims()` to verify it. Fix that function specifically. |
| Server-side tier validation | **Correct and still P0** — no edge function checks the user's subscription tier. |
| Server-side rate limiting | **Correct** — `generation_usage` table logs but never enforces. |
| Stale job cleanup | **Correct** — orphaned `generating` states have no recovery path. |
| Normalize wide table | **Correct but P2** — high effort, not blocking launch. |
| Pagination | **Correct** — silent data loss at 1000 rows. |
| CORS lockdown | **Correct but P3** — low risk on Lovable hosting. |
| Hardcoded emails | **Correct** — maintenance burden, not a security risk. |

---

## Revised Priority Table for Launch

| Priority | Issue | Effort | Status |
|----------|-------|--------|--------|
| **P0** | Fix all RLS policies from RESTRICTIVE to PERMISSIVE | Medium | **NEW — not in plan** |
| **P0** | Fix `dashboard_templates` SELECT to scope user-owned rows | Low | **NEW — not in plan** |
| **P0** | Re-enable leaked password protection | 5 min | **NEW — not in plan** |
| **P0** | Add server-side tier validation in edge functions | Medium | In plan |
| **P0** | Fix `analyze-company` to actually verify JWT via `getClaims()` | Low | Refined from plan |
| **P1** | Fix `streamUtils.ts` anon key fallback — throw instead | Low | **NEW** |
| **P1** | Add column projection to `getJobApplications` | 15 min | **NEW** |
| **P1** | Fix stale closure in `useApplicationDetail` realtime handler | 1 hr | **NEW** |
| **P1** | Fix `as any` casts + add missing fields to `ALLOWED_JOB_APP_FIELDS` | 30 min | **NEW** |
| **P1** | Add server-side rate limiting | Medium | In plan |
| **P1** | Add stale job cleanup mechanism | Low | In plan |
| **P2** | Extract shared layout component | 1 hr | **NEW** |
| **P2** | Add pagination to application lists | Low | In plan |
| **P2** | Background generator map cleanup | 30 min | **NEW** |
| **P3** | Lock CORS to production domain | Low | In plan |

---

## Correction to Plan's JWT Recommendation

The plan says to "remove `verify_jwt = false`" — this is **incorrect** for Lovable Cloud. The signing-keys system requires `verify_jwt = false` in config.toml, with JWT validation done in code via `getClaims()`. Most edge functions already do this correctly. The only function that doesn't is `analyze-company`, which checks for a Bearer header but never verifies it. The plan should be updated to reflect this distinction.

---

## Bottom Line

The plan is directionally correct but missed the biggest issue: **RLS is completely non-functional**. Fix that first, then address server-side tier enforcement. Everything else is important but secondary. The app is not ready for thousands of concurrent users until at minimum the P0 items above are resolved.

