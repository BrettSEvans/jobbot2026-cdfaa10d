

## Exploratory QA Findings -- Failures Only

| # | Action / Steps | Failure |
|---|---|---|
| 1 | Navigate to `/pricing` while logged out | Renders the **Landing page** instead of the **Pricing page**. The route in `App.tsx` maps `/pricing` to `<Landing />` for unauthenticated users. URL stays `/pricing` but content is wrong. |
| 2 | Navigate to any invalid URL (e.g. `/totally-fake-page-12345`) while logged out | Shows the **Landing page** instead of the **404 page**. The catch-all `path="*"` uses `<Navigate to="/" replace />`, making the NotFound page unreachable for logged-out users. |
| 3 | View Landing page on mobile (375px viewport) | **Header layout breaks**: "ResuVibe" logo text runs directly into the "Sign In" button with no gap/spacing. The nav items are crammed together without wrapping or a hamburger menu. |
| 4 | Navigate directly to `/verify-email` (no `?email=` param) | Page renders but shows generic "**your email**" placeholder instead of an actual address. The "Resend verification email" button is correctly disabled (`!email` guard), but there is **no visible explanation** of why it's disabled -- users hitting this URL directly see a dead-end with no actionable guidance. |
| 5 | Navigate directly to `/reset-password` (no token in URL) | Shows a **blank page** with only the text "Invalid or expired reset link." -- **no logo, no branding, no navigation, no back link**. Complete dead-end requiring manual URL editing to escape. |
| 6 | Check browser console on any page load | **Multiple React warnings**: "Function components cannot be given refs" fired repeatedly for `App`, `Toaster`, `TooltipProvider`, `QueryClientProvider`, and `Sonner`. These are dev-mode warnings from Radix UI / React 18 ref forwarding mismatches. Not user-facing but noisy and may mask real errors in logs. |

### Severity Assessment

- **P1 (High)**: Bug #5 -- Reset password dead-end is a real user-facing issue (users clicking expired email links get stranded).
- **P2 (Medium)**: Bugs #1, #2 -- Routing misconfigurations affect SEO and user navigation.
- **P3 (Medium)**: Bug #3 -- Mobile header overlap is a visual regression.
- **P4 (Low)**: Bug #4 -- Edge case with missing email param.
- **P5 (Low)**: Bug #6 -- Console noise from ref warnings.

### Recommended Fixes

**File: `src/App.tsx`**
- Bug #1: Change unauthenticated `/pricing` route from `<Landing />` to `<Pricing />`
- Bug #2: Change unauthenticated catch-all from `<Navigate to="/" replace />` to `<NotFound />`

**File: `src/pages/Landing.tsx`**
- Bug #3: Add responsive gap/wrapping to the `LandingNav` header -- either hide "Get Started Free" on small screens or add a hamburger menu

**File: `src/pages/ResetPassword.tsx`**
- Bug #5: Add branding, a "Back to sign in" link, and proper page structure to the invalid/expired token state

**File: `src/pages/VerifyEmail.tsx`**
- Bug #4: If no `email` param, redirect to `/auth` or show an explicit "No email provided" message with a link back

