

## Plan: Add Downgrade/Cancel to Pricing Page

### What changes

**1. Enable downgrade buttons** in `src/pages/Pricing.tsx`
- Remove the `isDowngrade` disable condition from buttons
- Show "Downgrade" label for lower-tier cards, make them clickable
- For the Free tier card when user is on a paid plan, show "Cancel Plan" instead of "Downgrade"

**2. Add confirmation dialog** using the existing `AlertDialog` component
- State to track which tier the user wants to switch to (`pendingTier`)
- Dialog warns about losing features when downgrading (list features they'll lose)
- "Cancel Plan" variant warns more strongly ("You'll lose access to X, Y, Z")
- Confirm button triggers the existing `upgrade` mutation (which already handles any tier change via `update`)

**3. Update button variants**
- Downgrade/cancel buttons use `destructive` or `outline` variant to differentiate from upgrades
- Current plan button stays disabled with "Current Plan" label

### Files modified
- `src/pages/Pricing.tsx` — all changes in this single file (add AlertDialog import, state, dialog markup, updated button logic)

### Technical notes
- The existing `upgradeMutation` in `useSubscription.ts` already works for downgrades (it just updates the `tier` column) — no backend changes needed
- Features lost will be computed by comparing `TIER_CONFIGS[currentTier].features` vs `TIER_CONFIGS[pendingTier].features`

