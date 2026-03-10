

## Auto-Approve & Skip Verification for Campaign Users

### Problem
Users arriving via marketing links (with UTM params) still must verify their email and wait for admin approval. They should be fully authorized immediately after signup.

### Approach

Three changes working together:

1. **Pass campaign data during signup** — Include `utm_campaign` from stored attribution in the signup metadata so the DB trigger can see it.

2. **Update `handle_new_user()` trigger** — Check if the new user's metadata contains a `utm_campaign` that matches an active campaign. If so, set `approval_status = 'approved'` immediately (no admin approval needed).

3. **Create edge function `confirm-campaign-signup`** — After signup, if the user came from a campaign, call this function which uses the service role key to auto-confirm the user's email via the admin API (`auth.admin.updateUserById`), bypassing email verification.

4. **Skip verify-email redirect** — In `Auth.tsx`, after a campaign signup, call the edge function and don't redirect to `/verify-email`. Instead show a toast and let them sign in immediately.

5. **Remove redundant campaign_auto_approve RPC call** — The existing post-login auto-approve logic in `App.tsx` becomes a fallback for edge cases but the primary approval now happens in the trigger.

### Files

| File | Action |
|------|--------|
| `supabase/functions/confirm-campaign-signup/index.ts` | Create — confirms email via admin API for campaign users |
| DB migration | Update `handle_new_user()` to auto-approve campaign signups based on metadata |
| `src/pages/Auth.tsx` | Edit — pass utm_campaign in signup metadata, skip verify-email for campaign users |
| `src/lib/api/jobSearch.ts` or new `src/lib/api/campaignSignup.ts` | Add helper to invoke the confirm edge function |

### Edge Function Logic
```text
POST confirm-campaign-signup { user_id, utm_campaign }
  → Verify campaign exists in campaigns table
  → Check max_signups cap not exceeded
  → Call auth.admin.updateUserById(user_id, { email_confirm: true })
  → Return { confirmed: true }
```

### Auth.tsx Signup Flow Change
```text
Before: signup → always redirect to /verify-email
After:  signup → if attribution has utm_campaign:
          → call confirm-campaign-signup edge function
          → toast "Account created! You can now sign in."
          → stay on login mode
        else:
          → redirect to /verify-email (unchanged)
```

