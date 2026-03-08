

## Red Team Architectural Review & Refactoring Plan

### Critical Security Findings

**1. CRITICAL: All 44 RLS policies are RESTRICTIVE (non-functional)**
Every RLS policy is defined as `RESTRICTIVE`. PostgreSQL requires at least one `PERMISSIVE` policy to grant access -- `RESTRICTIVE` policies can only narrow existing grants. This means all RLS policies are no-ops. The app works only because edge functions use the service role key (bypassing RLS entirely). If any client-side query hits these tables directly, the intended isolation is unenforced.

**Fix:** Redefine all user-facing RLS policies as `PERMISSIVE`. Layer `RESTRICTIVE` policies only where additional mandatory constraints are needed.

**2. CRITICAL: Users can self-escalate subscription tier**
The `user_subscriptions` table has an UPDATE policy with no column restrictions. Any authenticated user can change their own `tier` from `free` to `premium`, extend `current_period_end`, or modify Stripe fields. This is a privilege escalation vulnerability.

**Fix:** Remove the user-facing UPDATE policy on `user_subscriptions`. All subscription mutations should go through server-side functions with service role validation against Stripe.

**3. HIGH: All 26 edge functions have `verify_jwt = false`**
Every edge function in `config.toml` disables JWT verification. This means any anonymous request can invoke any function -- generate resumes, scrape companies, score ATS, export DOCX. The rate-limit check inside functions partially mitigates this (it reads the auth header), but it's defense-in-depth failure. An attacker can call functions without any valid token.

**Fix:** Enable `verify_jwt = true` on all functions. The `streamUtils.ts` client already sends the auth token. Functions that need public access (if any) should be explicitly listed.

**4. MEDIUM: Leaked Password Protection disabled**
HaveIBeenPwned integration is off. Users can sign up with known compromised passwords.

**Fix:** Enable leaked password protection via auth configuration.

---

### Architectural Debt

**5. 682 `as any` casts across 32 files**
The codebase uses `(supabase as any)` extensively to bypass TypeScript's generated types. This indicates the Supabase types file is out of sync with the actual database schema. Every `as any` is a potential runtime error hiding behind a type escape hatch.

**Fix:** Regenerate `types.ts` from the current schema. Remove all `as any` casts and use properly typed queries. For tables not yet in types, add them via migration + type regeneration.

**6. Deprecated `useAdminRole` hook still in use**
`Profile.tsx` still imports the deprecated `useAdminRole` instead of `useUserRoles`. This is a dead-code smell and creates confusion.

**Fix:** Replace `useAdminRole` import in `Profile.tsx` with `useUserRoles`. Delete `useAdminRole.ts`.

**7. Profile.tsx is 746 lines -- monolith**
The Profile page has identity management, resume upload/rename/delete, skills/industry tags, tone selection, style preferences, test user management, and admin link all in one file. This violates the project's own decomposition standard.

**Fix:** Extract into sub-components: `IdentityCard`, `ResumeCard`, `SkillsCard`, `ToneCard`. Keep Profile.tsx as orchestrator (~150 lines).

**8. Applications.tsx is 713 lines -- monolith**
Contains table view, pipeline view, trash view, ghost prompt logic, sort logic, backfill logic, and preview drawer all inline.

**Fix:** Extract: `ApplicationsListView`, `ApplicationsTrashView`, `GhostPromptBanner`, `ApplicationsSortControls`.

**9. backgroundGenerator.ts is 566 lines with duplicated asset generators**
Five nearly identical `generateX` functions (exec report, raid log, arch diagram, roadmap, resume) each follow the same pattern: stream, accumulate, clean. This violates DRY.

**Fix:** Create a generic `streamAndClean(fnRef, params)` helper. Reduce the five generators to parameterized calls.

**10. Rate limit logic duplicated across all 26 edge functions**
The `checkRateLimit` function is copy-pasted into every edge function. A bug fix requires editing 26 files.

**Fix:** Extract into a shared `_shared/rateLimit.ts` module that all edge functions import.

---

### Implementation Priority

| Priority | Issue | Risk | Effort |
|----------|-------|------|--------|
| P0 | Fix RLS policies (RESTRICTIVE → PERMISSIVE) | Data isolation failure | Medium |
| P0 | Remove user UPDATE on subscriptions | Privilege escalation | Low |
| P0 | Enable `verify_jwt = true` on edge functions | Unauthenticated API abuse | Low |
| P1 | Enable leaked password protection | Credential stuffing | Low |
| P1 | Regenerate Supabase types, remove `as any` | Runtime errors, maintainability | Medium |
| P2 | Extract shared rate-limit module for edge functions | Maintainability | Medium |
| P2 | Decompose Profile.tsx | Tech debt | Medium |
| P2 | Decompose Applications.tsx | Tech debt | Medium |
| P3 | Refactor backgroundGenerator DRY | Tech debt | Low |
| P3 | Delete deprecated useAdminRole | Dead code | Low |

### Recommended Execution Order

**Phase 1 -- Security hardening (P0s):** Single migration to convert all RLS policies to PERMISSIVE, drop the user UPDATE policy on subscriptions. Update `config.toml` to enable JWT verification. These are non-negotiable before any public launch.

**Phase 2 -- Type safety (P1):** Regenerate types, systematically remove `as any` casts, enable leaked password protection.

**Phase 3 -- Code health (P2-P3):** Decompose monolith pages, extract shared edge function utilities, clean up deprecated hooks.

