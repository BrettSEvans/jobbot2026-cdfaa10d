
Goal: make logout reliable everywhere and remove the class of bugs where a sign-out gets silently reversed.

What I found
- The logout flow is currently fragile because `useAuth()` is not a shared provider; every component calling it creates its own independent auth listener and its own refs/state.
- `App.tsx` calls `useAuth()`, `AppHeader.tsx` calls `useAuth()`, `useIsAdmin()` inside `AppHeader.tsx` calls `useAuth()` again, and `Admin.tsx` has the same pattern.
- The current “silent recovery” logic in `src/hooks/useAuth.ts` treats `SIGNED_OUT` as recoverable unless that specific hook instance had `intentionalSignOut.current = true`.
- When the header button calls `signOut()` on one hook instance, other hook instances still receive `SIGNED_OUT` with `intentionalSignOut.current = false` and can call `refreshSession()`, which can restore the session.
- There is a second inconsistency: `useInactivityLogout.ts` bypasses the hook entirely and calls `supabase.auth.signOut()` directly, so it can also interact badly with the refresh logic.

Robust fix
1. Centralize auth state
- Convert auth from a plain hook into a single shared auth context/provider.
- Create one subscription to auth changes for the whole app.
- Store `user`, `session`, `loading`, `signOut`, and the intentional sign-out flag in that provider.
- Make `useAuth()` read from context instead of creating new listeners/state each time.

2. Make sign-out authoritative
- Keep a single global `intentionalSignOut` ref/state in the provider.
- When `signOut()` is called:
  - set intentional sign-out first
  - optionally set local auth state to loading/signed-out immediately for responsive UI
  - call backend sign-out
  - do not allow refresh recovery during this path
- For extra safety, treat explicit logout as terminal for the current tab until a fresh login occurs.

3. Narrow the refresh recovery logic
- Do not run “try refresh on SIGNED_OUT” as the generic fallback.
- Restrict silent recovery to genuine session-loss cases only, such as:
  - `TOKEN_REFRESHED` failure handling path, or
  - initial bootstrap with a stale local session but valid refresh token
- In practice, the simplest robust rule is:
  - never auto-refresh in response to `SIGNED_OUT`
  - only refresh during app initialization or explicit session-recovery logic
- This removes the main cause of logout being undone.

4. Route every sign-out through one function
- Update `src/hooks/useInactivityLogout.ts` to use the shared auth provider’s `signOut()` instead of calling `supabase.auth.signOut()` directly.
- Keep one source of truth for:
  - manual header logout
  - mobile drawer logout
  - inactivity timeout logout
  - any future forced logout flows

5. Reduce duplicate auth consumers
- Refactor places that call `useAuth()` multiple times in the same tree.
- In `AppHeader.tsx`, use the current user from one auth read and pass `user.id` into the admin-role query instead of calling `useAuth()` again inside `useIsAdmin()`.
- Apply the same cleanup pattern anywhere else that nests auth hook calls.

Files to change
- `src/hooks/useAuth.ts`
  - refactor into provider + context-backed hook
  - remove per-instance listener behavior
  - harden sign-out and recovery logic
- `src/App.tsx`
  - wrap the app in the auth provider
  - consume shared auth state from provider
- `src/hooks/useInactivityLogout.ts`
  - use shared `signOut()` instead of direct backend sign-out
- `src/components/AppHeader.tsx`
  - use the shared auth state
  - avoid nested independent auth hook instances
- `src/pages/Admin.tsx`
  - same cleanup if needed for role checks

Verification plan
- Desktop header logout:
  - click logout icon
  - confirm redirect to `/login`
  - confirm no automatic re-login
- Mobile drawer logout:
  - open drawer, click Sign Out
  - confirm redirect to `/login`
- Inactivity logout:
  - trigger timeout flow in a shortened/local test setup
  - confirm it also stays logged out
- Login after logout:
  - sign back in and verify normal session restore still works
- Regression check:
  - ensure onboarding/profile/admin gating still work with shared auth state
  - ensure avatar and user email still render correctly after login/logout transitions

Why this is the right fix
- It fixes the root cause, not just the symptom.
- The problem is architectural: multiple auth listeners with conflicting sign-out intent.
- A shared provider plus “never refresh on SIGNED_OUT” makes logout deterministic and prevents future recurrence across all buttons and timeout paths.
