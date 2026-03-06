

## Public Landing Page — Plan

### Current State
Right now, unauthenticated users hit `Auth.tsx` (login/signup form) for all routes via the catch-all `<Route path="*" element={<Auth />} />`. The Auth page already has a decent left-panel hero with feature bullets, but it's not a proper marketing landing page.

### What We'll Build
A dedicated `/landing` page (rendered at `/` for unauthenticated users) with these sections:

1. **Hero** — Headline, subheadline, CTA buttons ("Get Started Free" → signup, "See Pricing" → scroll), decorative gradient background
2. **Features Grid** — 6 cards showcasing: Branded Dashboards, Tailored Cover Letters, Executive Reports, RAID Logs, Roadmaps, Architecture Diagrams — with icons and short descriptions
3. **How It Works** — 3-step visual: Paste Job URL → AI Generates Assets → Download & Apply
4. **Example Assets** — Visual preview cards showing what generated assets look like (static mockup screenshots or styled placeholder cards)
5. **Pricing Section** — Reuse the existing `TIER_CONFIGS` to render the 3-tier pricing table inline (no need to navigate to `/pricing`)
6. **CTA Footer** — Final call-to-action with signup button

### Routing Changes (App.tsx)
- When user is **not** authenticated, render:
  - `/` → `LandingPage`
  - `/pricing` → `LandingPage` (scroll to pricing anchor)
  - `/auth` → `Auth` (dedicated login/signup page)
  - `*` → redirect to `/`
- Add "Sign In" / "Get Started" buttons on the landing page that navigate to `/auth`
- The existing `Auth.tsx` stays as-is but becomes accessible at `/auth` instead of being the catch-all

### New Files
- `src/pages/Landing.tsx` — The full landing page component with all sections

### Modified Files
- `src/App.tsx` — Update unauthenticated routing: `/` renders Landing, `/auth` renders Auth, keep `/reset-password`

### Design Approach
- Uses existing teal/emerald design system, `font-heading` (Plus Jakarta Sans), and shadcn components (Card, Button, Badge)
- Responsive: mobile-first with grid layouts that adapt
- Lightweight navbar at top with JobBot logo + "Sign In" / "Get Started" buttons
- Smooth scroll anchors for pricing section
- No new dependencies needed

