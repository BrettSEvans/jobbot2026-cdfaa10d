

# Campaign User Cap + Auto-Approve Campaign Signups

## Overview

Two features: (1) optional max signups per campaign, and (2) users arriving via a campaign link skip the approval workflow and are auto-approved.

## Changes

### 1. Database: Add `max_signups` column to `campaigns`

```sql
ALTER TABLE public.campaigns ADD COLUMN max_signups integer DEFAULT NULL;
```

`NULL` means unlimited. A value like `10` means the link stops working after 10 signups.

### 2. Database: Update `handle_new_user()` trigger

Modify the existing trigger function to check if the new user's email was registered via a campaign link. Since attribution isn't available at trigger time (it's stored client-side), we'll handle auto-approval client-side instead.

### 3. Client-side: Auto-approve campaign users (`src/App.tsx`)

In the existing attribution persistence block (lines 75-81), after saving `referral_source` to the profile:
- If the user has a `utm_campaign` in their attribution data, query the `campaigns` table to see if a matching campaign exists
- If a campaign exists and `max_signups` is either NULL or not yet reached, call an RPC to auto-approve the user
- If `max_signups` is reached, leave the user in pending state (the campaign is "full")

Since the `protect_approval_status` trigger only allows admins to change `approval_status`, we need a **security definer RPC** to handle campaign-based auto-approval:

```sql
CREATE OR REPLACE FUNCTION public.campaign_auto_approve(_user_id uuid, _utm_campaign text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max integer;
  v_current integer;
BEGIN
  -- Check if campaign exists and get cap
  SELECT max_signups INTO v_max
  FROM public.campaigns
  WHERE utm_campaign = _utm_campaign
  LIMIT 1;

  -- No matching campaign found
  IF NOT FOUND THEN RETURN false; END IF;

  -- Check cap
  IF v_max IS NOT NULL THEN
    SELECT count(*) INTO v_current
    FROM public.profiles
    WHERE referral_source->>'utm_campaign' = _utm_campaign;
    
    IF v_current >= v_max THEN RETURN false; END IF;
  END IF;

  -- Auto-approve
  UPDATE public.profiles
  SET approval_status = 'approved'
  WHERE id = _user_id AND approval_status = 'pending';

  RETURN true;
END;
$$;
```

### 4. Client-side: Call the RPC after saving attribution (`src/App.tsx`)

After persisting attribution to profile (~line 76-81), if `attribution.utm_campaign` exists and `approval_status` is `pending`, call `supabase.rpc('campaign_auto_approve', { _user_id: user.id, _utm_campaign: attribution.utm_campaign })`. If it returns `true`, set `approvalStatus` to `'approved'` immediately so the user bypasses the pending screen.

### 5. UI: Add `max_signups` field to campaign create dialog (`AdminCampaignsTab.tsx`)

- Add optional "Max Signups" number input to the create form
- Show cap vs current signups in the campaigns table (e.g., "7 / 10" or "3 / ∞")
- Add `max_signups` to the `Campaign` interface

### 6. UI: Show "full" badge when cap is reached

In the campaigns table, show a red "Full" badge next to campaigns where signups >= max_signups.

