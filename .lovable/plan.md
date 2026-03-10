

# Marketing Attribution System + Campaign Admin Dashboard

## Overview

Three additions: (1) a marketing attribution capture utility, (2) a `referral_source` column on profiles, and (3) a new Campaign Dashboard in the Admin panel gated behind a `marketing` role.

## Database Changes

### Migration 1: Add `referral_source` to profiles
```sql
ALTER TABLE public.profiles
  ADD COLUMN referral_source jsonb DEFAULT NULL;
```

### Migration 2: Add `marketing` to `app_role` enum
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
```

This enables `marketing` as a valid role in `user_roles`.

## New Files

### 1. `src/lib/marketingAttribution.ts` (~50 lines)
- `captureAttribution()` — reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `ref` from URL, saves to `localStorage` as `resuvibe_attribution` (first-touch only — skip if already stored).
- `getStoredAttribution()` — returns stored object or null.
- `clearAttribution()` — removes the key after DB persistence.

### 2. `src/hooks/useUserRoles.ts` — update
Add `isMarketing` boolean derived from `roles.includes('marketing')`.

### 3. `src/components/admin/AdminCampaignsTab.tsx` (~150 lines)
Campaign admin dashboard showing:
- **Attribution overview table**: query `profiles` where `referral_source IS NOT NULL`, display user email, UTM source/medium/campaign, ref code, signup date.
- **Campaign summary cards**: aggregate counts by `utm_campaign` and `ref` code.
- **Date range filter** for narrowing results.

Only accessible to users with `marketing` or `admin` role.

### 4. `src/components/admin/AdminSidebar.tsx` — update
Add new section:
```typescript
{ id: "campaigns", label: "Campaigns", icon: Megaphone, group: "Marketing", requiresAdmin: false, requiresQA: false, requiresMarketing: true }
```

Update `AdminSection` interface to add `requiresMarketing: boolean`. Update `getVisibleSections` to filter on marketing role (admins see everything).

### 5. `src/pages/Admin.tsx` — update
- Import `AdminCampaignsTab`, add `case "campaigns"` to `renderSection()`.
- Pass `isMarketing` from `useUserRoles` to sidebar.
- Allow access if user has marketing role (`hasAnyRole` already covers this).

## Changes to `App.tsx`

- Call `captureAttribution()` on mount (before auth check) to capture anonymous visitors.
- In `AuthenticatedApp`, after user is set: read `getStoredAttribution()`, if present and user's `referral_source` is null, update profile and pass as traits to `analytics.identify()`, then `clearAttribution()`.

## RLS

No new RLS needed — the existing `profiles` policies allow admins to read all profiles (for the campaign dashboard queries). Marketing role users will need a new policy:

```sql
CREATE POLICY "Marketing can read profiles for attribution"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'marketing'::app_role])
  );
```

## Example Marketing Links

```
https://jobbot2026.lovable.app/?ref=linkedin-march25
https://jobbot2026.lovable.app/?utm_source=twitter&utm_campaign=launch
https://jobbot2026.lovable.app/?utm_source=email&utm_medium=newsletter&utm_campaign=week12&ref=nl-cta
```

## Net Effect

- ~50-line attribution utility
- ~150-line campaign dashboard component
- One enum addition + one column migration + one RLS policy
- Small updates to sidebar, Admin page, roles hook, and App.tsx
- Full PostHog integration via existing `analytics.identify()`

