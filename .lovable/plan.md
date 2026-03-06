

# Rebrand-Ready: Centralize the "JobBot" Name

## Problem
The brand name "JobBot" is hardcoded across 14 files (~150 occurrences). A rebrand would require a tedious find-and-replace across the entire codebase.

## Solution
Create a single `src/lib/branding.ts` config file that exports all brand-related strings. Every file that references the brand name will import from this central config. Changing the name becomes a one-line edit.

## Branding Config

A new file `src/lib/branding.ts` will export a `BRAND` object:

```typescript
export const BRAND = {
  name: "JobBot",                              // Display name
  tagline: "AI-Powered Job Application Toolkit",
  description: "Using this isn't fair to the other applicants. Sorry not sorry.",
  twitter: "@JobBot",
  copyright: (year: number) => `© ${year} JobBot. All rights reserved.`,
  // localStorage keys (prefixed with brand slug)
  storagePrefix: "jobbot",
};
```

## Files to Update

**14 files** need to reference `BRAND` instead of hardcoded strings:

| File | Occurrences | What changes |
|---|---|---|
| `index.html` | 6 | Title, meta author, og:title, twitter:title, twitter:site -- these will be set dynamically via a `useEffect` in `App.tsx` or kept static with a comment noting manual update needed |
| `src/pages/Landing.tsx` | ~20 | Nav logo, hero copy, steps copy, testimonial quotes, section headings, footer |
| `src/components/AppHeader.tsx` | 1 | Logo text |
| `src/pages/Auth.tsx` | 2 | Logo on login page (desktop + mobile) |
| `src/pages/PendingApproval.tsx` | 1 | Logo text |
| `src/pages/Applications.tsx` | 2 | Welcome message, tutorial prompt |
| `src/lib/tutorial/steps.ts` | 3 | Tutorial step titles and body text |
| `src/lib/helpEntries.ts` | 1 | Help entry description |
| `src/components/admin/AdminGuideTab.tsx` | 1 | Admin guide text |
| `src/hooks/useTheme.ts` | 2 | localStorage key `"jobbot-theme"` -> `BRAND.storagePrefix + "-theme"` |
| `src/hooks/useTutorial.ts` | 2 | localStorage keys |
| `src/contexts/ImpersonationContext.tsx` | 1 | Session key |
| `src/components/BatchModePrompt.tsx` | 1 | Dismissed key |
| `docs/ADMIN_GUIDE.md` | 3 | Documentation references (comment noting manual update) |

## Approach for `index.html`

Since `index.html` cannot import TypeScript, we will:
1. Add a small `useEffect` in `App.tsx` that sets `document.title` from `BRAND`.
2. Leave `index.html` meta tags with a `<!-- REBRAND: update these -->` comment, since meta tags for OG/Twitter are static and cannot be dynamically set in a SPA without SSR.

## Approach for Testimonial Quotes

Testimonial quotes that mention "JobBot" by name (e.g., "JobBot helped me...") will use template literals referencing `BRAND.name` so they update automatically.

## Implementation Order

1. Create `src/lib/branding.ts` with the `BRAND` config object
2. Update all 12 TypeScript/TSX files to import and use `BRAND`
3. Add dynamic `document.title` in `App.tsx`
4. Add rebrand comments in `index.html` and `docs/ADMIN_GUIDE.md`

