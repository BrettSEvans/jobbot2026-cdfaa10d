

## Plan: Ensure Logins Persist Across Refreshes

### Problem

The current `useAuth` hook has a race condition on page refresh. Both `onAuthStateChange` and `getSession` independently set `loading = false` and update the user state. On a refresh:

1. `onAuthStateChange` fires with an `INITIAL_SESSION` event — but if it fires before the stored session is restored, it may briefly report `session = null`
2. This causes `AuthenticatedApp` to render the unauthenticated routes (Landing/Auth), which navigates the user away
3. When `getSession` then resolves with the real session, the user is already on `/auth` or `/`

### Fix

**File: `src/hooks/useAuth.ts`** — Rewrite to eliminate the race condition:

- Set up `onAuthStateChange` **before** calling `getSession` (already correct per Supabase docs)
- Only set `loading = false` from `getSession`, not from `onAuthStateChange` during initial load
- Use a ref to track whether initial session has been resolved, so `onAuthStateChange` doesn't prematurely clear the user during the first render cycle

```
useEffect:
  1. Subscribe to onAuthStateChange — update user/session on every event, 
     but only set loading=false if initialLoadDone ref is true
  2. Call getSession — set user/session, set loading=false, set initialLoadDone=true
```

This ensures that on refresh, the app stays in the loading spinner until the persisted session is actually checked, preventing any flash of unauthenticated UI.

**File: `src/hooks/useIdleTimeout.ts`** — No changes needed. The idle timeout already resets on user activity and only logs out after 30 minutes of true inactivity. Refreshes trigger `mousemove`/`click` events which reset the timer.

### Summary

Single file change to `useAuth.ts` — fix the initialization order so persisted sessions are always restored before the loading state clears.

