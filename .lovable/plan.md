

## Change Free Tier to 7-Day Trial with New Limits

### Summary
Transform the permanent "Free" tier into a "7-Day Free Trial" with limits of 5 resumes and 2 portfolio items per resume. This requires changes across 13 files plus a database migration.

### All Identified Locations Requiring Changes

**1. Core Config — `src/lib/subscriptionTiers.ts`**
- Add `trialDays` and `portfolioItemsPerApp` to `TierConfig` interface
- Add `isTrialExpired(periodEnd: string)` helper function
- Add `getPortfolioLimit(tier)` helper
- Update free tier config:
  - `label`: "Free" → "Free Trial"
  - `description`: "Get started with the basics" → "Try everything for 7 days"
  - `appsPerMonth`: 2 → 5
  - Add `portfolioItemsPerApp: 2`
  - `features`: update to ["7-day free trial", "5 resumes", "2 portfolio items per resume", "ATS score analysis"]
  - `cta`: "Current Plan" → "Start Free Trial"
  - Add `trialDays: 7`
- Update pro `features[0]`: "Everything in Free +" → "Everything in Trial +"

**2. Subscription Hook — `src/hooks/useSubscription.ts`**
- Import `isTrialExpired` helper
- Change fallback `current_period_end` from 30 days to 7 days
- Export `isTrialExpired` boolean and `trialDaysRemaining` number
- Export `portfolioLimit` from tier config

**3. Landing Page — `src/pages/Landing.tsx`** (5 locations)
- Line 51: "Get Started Free" → "Start Free Trial"
- Line 75: "Get Started Free" → "Start Free Trial"
- Line 120: "Start for Free" → "Start Your Free Trial"
- Line 127: "Free forever" → "7-day free trial"
- Line 344: "Start free. Upgrade when you need more power." → "Start with a 7-day free trial. Upgrade anytime."
- Line 509: "Get Started Free" → "Start Free Trial"
- Landing pricing card: "$0" label should show "for 7 days"

**4. Auth Page — `src/pages/Auth.tsx`**
- Line 167: "Get started with your free account" → "Start your 7-day free trial"

**5. App Header — `src/components/AppHeader.tsx`** (2 locations)
- Line 113: "Free" → "Trial" (desktop badge), add "Trial Expired" destructive variant when expired
- Line 180: "Free" → "Trial" (mobile badge)

**6. Pricing Page — `src/pages/Pricing.tsx`** (8 locations)
- Line 78: "You're now on the Free plan." → "You're now on the Free Trial."
- Line 110: Show badge for free trial users too (with days remaining)
- Lines 118-131: Usage bar — hardcoded `/ 2` → use `appLimit`, also show trial days remaining
- Line 151: highlight logic unchanged (still works)
- Line 196: "$0" display → add "for 7 days" subtext
- Line 247: "Cancel your plan?" → "End your trial?" when free
- Line 253: "return to the Free plan" → "Your trial has ended"
- Line 280: "Switch to Free" → "Cancel to Trial"

**7. ProUsageBar — `src/components/ProUsageBar.tsx`**
- Currently only shows for `tier === "pro"` — extend to also show for free trial users with days remaining counter

**8. NewApplication — `src/pages/NewApplication.tsx`**
- Line 173: Update message to mention trial context when tier is free and trial is expired
- Add trial expiration gate: if trial expired, block creation with "Your 7-day free trial has ended" + upgrade CTA

**9. ApplicationDetail — `src/pages/ApplicationDetail.tsx`**
- Line 360: `isPreviewOnly={tier === "free"}` — also check trial expiration (expired trial = fully locked, active trial = allow usage within limits)

**10. Watermark utility — `src/lib/watermarkHtml.ts`**
- Line 2: Comment update only ("free tier" → "free trial")

**11. Help & QA entries — `src/lib/helpEntries.ts`, `src/lib/qaEntries.ts`**
- helpEntries line ~595: "free plan" → "free trial"
- qaEntries line ~964: "free tier" → "free trial"

**12. DynamicAssetTab — `src/components/DynamicAssetTab.tsx`**
- Line 5: Comment update ("free tier" → "free trial")

**13. Test fixtures — `src/test/maui/fixtures/index.ts`**
- Update `mockSubscription.free` period end to 7 days from start

**14. Test files** — `src/test/maui/assetSelector.test.ts`, `src/test/maui/docxExport.test.ts`, `src/test/maui/atsScore.test.ts`
- Update descriptions from "free tier" → "free trial"

### Database Migration

Update the `handle_new_user` trigger to set `current_period_end` to 7 days instead of relying on the column default of 30 days:

```sql
-- Update handle_new_user to set 7-day trial period
CREATE OR REPLACE FUNCTION public.handle_new_user() ...
  INSERT INTO public.user_subscriptions (user_id, tier, status, current_period_end)
  VALUES (NEW.id, 'free', 'active', now() + interval '7 days');
```

Also update the column default:
```sql
ALTER TABLE public.user_subscriptions 
  ALTER COLUMN current_period_end SET DEFAULT (now() + interval '7 days');
```

### Portfolio Items Per Resume Limit (New Concept)

The current system has no concept of "portfolio items per resume." The `allowedAssets` array controls which asset *types* are available per tier. To implement "2 portfolio items per resume":

- Add `portfolioItemsPerApp: 2` to the free trial tier config (pro/premium get higher or unlimited values)
- In `backgroundGenerator.ts`, when generating assets for free trial users, limit non-resume/non-cover-letter assets to 2
- In `ApplicationDetail.tsx`, enforce the count of visible portfolio tabs

### Trial Expiration Enforcement

New `isTrialExpired` helper in `subscriptionTiers.ts`:
```typescript
export function isTrialExpired(periodEnd: string | null): boolean {
  if (!periodEnd) return false;
  return new Date(periodEnd) < new Date();
}
```

When trial is expired:
- `NewApplication`: block new app creation entirely
- `ApplicationDetail`: read-only mode (existing apps still viewable)
- `AppHeader`: badge shows "Trial Expired" in destructive color
- `Pricing`: show "Trial ended" banner instead of usage bar

### Files Not Needing Changes
- `UpgradeGate.tsx` — generic, works with any tier check
- `useAppUsage.ts` — counts apps regardless of tier, no changes needed
- Edge functions — tier enforcement is client-side currently
- RLS policies — unchanged
- `supabase/config.toml` — unchanged

