

## UX/PM Review: Pricing Page Issues & Fixes

### Problems Identified

1. **Downgrade/Cancel buttons use `destructive` (red) variant** — This visually draws attention to the action we least want users to take. Red buttons are high-contrast CTAs; they scream "click me." From a retention standpoint, this is backwards.

2. **"Cancel Plan" and "Downgrade" labels are too prominent** — They sit in the same visual weight as upgrade CTAs. A user on Premium sees a red "Cancel Plan" and a red "Downgrade" button — two loud negative actions vs one disabled "Current Plan."

3. **No upsell or value reinforcement for current plan users** — When on Premium, there's nothing encouraging the user to stay. The card just says "Current Plan" with a disabled button. No "You're getting the best" messaging on the card itself.

4. **Free tier card shows "Current Plan" disabled button for free users** — Missed opportunity to nudge upgrades. Could say "Your starter plan" with a subtle upgrade prompt.

5. **The confirmation dialog uses a red warning icon** — Good friction, but the dialog confirm button is also red. The "Keep current plan" button should be the visually dominant one (primary), and the downgrade action should be subdued.

### Plan

**File: `src/pages/Pricing.tsx`**

**A. De-emphasize downgrade/cancel buttons**
- Change `buttonVariant` for downgrades from `"destructive"` to `"ghost"` — renders as a subtle text-style link, not a loud red CTA
- Change labels: "Cancel Plan" → "Switch to Free", "Downgrade" → "Switch to {tier}"
- Keep them functional but visually recessive

**B. Flip the confirmation dialog button hierarchy**
- Make "Keep current plan" the primary action (`AlertDialogAction` with default/primary styling)
- Make the downgrade confirm button the secondary/subdued one (`AlertDialogCancel`-style with ghost or outline variant)
- This follows the UX pattern of making the retention action easiest to click

**C. Add value reinforcement on the current plan card**
- When user is on Premium, add a subtle line like "You have access to everything" beneath the "Current Plan" button
- Reinforces the value they're getting, reducing churn impulse

