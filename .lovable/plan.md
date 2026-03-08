

## Plan: Remove Daily Generation Limits & Update Monthly Caps

### Summary
Remove all "generations per day" limits across the application. Users will only be limited by monthly application caps. Pro users will be updated from 15 to 20 apps/month.

---

### Changes Overview

#### 1. Update Subscription Tiers Configuration
**File:** `src/lib/subscriptionTiers.ts`

- Remove `generationsPerHour` and `generationsPerDay` from the `limits` interface
- Update Pro tier `appsPerMonth` from 15 → 20
- Update feature lists to remove daily generation references:
  - Free: Remove "15 generations per day"
  - Pro: Remove "100 generations per day", update "15 applications per month" → "20 applications per month"
  - Premium: Remove "250 generations per day"

#### 2. Update 17 Edge Functions
**Files:** All edge functions in `supabase/functions/` that contain rate limiting logic

Functions to update:
- `generate-architecture-diagram`, `generate-dashboard`, `generate-dynamic-asset`, `generate-executive-report`, `generate-raid-log`, `generate-resume`, `generate-roadmap`
- `refine-architecture-diagram`, `refine-dashboard`, `refine-dynamic-asset`, `refine-executive-report`, `refine-raid-log`, `refine-resume`, `refine-roadmap`
- `score-ats-match`, `tailor-cover-letter`, `propose-assets`

Changes per function:
- Remove the `TIER_LIMITS` constant and `perDay`/`perHour` checks
- Remove `dayCount`/`hourCount` queries against `generation_usage`
- Keep the `generation_usage` insert for analytics/auditing purposes
- Remove the 429 rate limit response logic tied to daily/hourly limits

The `checkRateLimit` function will be simplified to:
1. Authenticate the user
2. Check for `is_unlimited` override (keep for admin flexibility)
3. Log the generation to `generation_usage` for analytics
4. Always allow (no daily/hourly blocking)

#### 3. Landing Page Pricing Card
**File:** `src/pages/Landing.tsx`

No direct changes needed — the pricing card reads from `TIER_CONFIGS.features[]`, so updating the source config propagates automatically.

---

### Technical Details

**Database:** No schema changes required. The `rate_limit_overrides` table can remain for admin flexibility (e.g., temporarily blocking abusive users), but the `per_hour`/`per_day` columns become optional metadata.

**Edge Function Pattern (simplified):**
```typescript
// Before: Complex daily/hourly checks
// After: Just log and allow
async function checkRateLimit(req, assetType, edgeFunction) {
  // Auth check
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();
  
  // Log for analytics
  await supabase.from('generation_usage').insert({...});
  
  // Always allow (no daily limits)
  return null;
}
```

**Affected UI Components:**
- Pricing card on Landing page (auto-updates from config)
- `ProUsageBar` component (tracks monthly app usage, unaffected)
- `useAppUsage` hook (tracks monthly limits, unaffected)

