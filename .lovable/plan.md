

## Plan: FAQ Updates + Section Navigation Menu

### Task 1 — Add FAQ Items & Make Section Collapsible

**File: `src/pages/Landing.tsx`**

- Add 3 new entries to `FAQ_ITEMS` array:
  1. "How is ResuVibe different from other resume builders?" — complete portfolio answer
  2. "How does the AI editing work?" — vibe editing chat answer
  3. "Can I track my job applications within ResuVibe?" — Kanban/pipeline answer

- Wrap the entire FAQ `<section>` content in a collapsible container:
  - Add a `useState` toggle (`faqOpen`, default `false`)
  - The heading + subtitle stay visible; below them, a "Show FAQ" / "Hide FAQ" toggle button
  - The accordion content collapses/expands with a smooth transition using Collapsible from Radix

### Task 2 — Hamburger Menu Section Navigation

**File: `src/pages/Landing.tsx`**

- Add `id` attributes to each major section:
  - `id="portfolio"` on ExampleAssets
  - `id="how-it-works"` on HowItWorks
  - `id="features"` on Features
  - `id="pricing"` (already exists)
  - `id="reviews"` on SocialProof
  - `id="faq"` on Faq

- Update `LandingNav` to include section jump links:
  - **Mobile hamburger**: Add smooth-scroll links (Portfolio, How It Works, Features, Pricing, Reviews, FAQ) above the Sign In / Start Free Trial buttons. Each link closes the sheet and scrolls to the section.
  - **Desktop nav**: Add the same section links as `Button variant="ghost"` items before Sign In.

### Files Changed

| File | Changes |
|---|---|
| `src/pages/Landing.tsx` | Add `useState` import, 3 new FAQ items, collapsible FAQ wrapper, section `id` attrs, nav section links in both mobile and desktop |

