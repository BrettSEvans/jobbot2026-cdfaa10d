

# Plan: Apply ResuVibe Branding to Current Site

## What We Know

From the fetched site and project memory, ResuVibe uses:

- **Colors**: Warm amber/gold primary (`hsl(36 90% 50%)`), deep indigo/navy accent (`hsl(234 45% 52%)`)
- **Fonts**: DM Serif Display (headings), DM Sans (body)
- **Logo**: "RV" monogram — white R + golden V on dark navy rounded square, plus wordmark. Logo image at `https://www.resuvibe.ai/assets/resuvibe-logo-CjSX5jrs.png`
- **Favicon**: RV monogram on dark navy background (SVG-based)
- **Visual effects**: Noise-texture grain overlay, warm gradient backgrounds, elevated card shadows

## Changes

### 1. Update `index.html`
- Set title to "ResuVibe"
- Add Google Fonts link for DM Serif Display and DM Sans
- Update favicon to reference the RV monogram (we'll create an SVG favicon)
- Update OG meta tags

### 2. Update `src/index.css`
- Replace CSS variables with ResuVibe color palette:
  - `--primary`: `36 90% 50%` (amber/gold)
  - `--primary-foreground`: `0 0% 100%` (white)
  - `--accent`: `234 45% 52%` (indigo)
  - Appropriate surface, muted, border colors
- Add `--font-heading` and `--font-body` custom properties
- Add `font-heading` and `font-body` utility classes
- Add `noise-texture` utility class for grain effect
- Add `--shadow-warm` and `--shadow-elevated` custom properties
- Set up dark mode variants with the same brand palette

### 3. Update `tailwind.config.ts`
- Add `fontFamily` entries for `heading` (DM Serif Display) and `body` (DM Sans)
- Add custom shadow utilities for warm/elevated shadows

### 4. Create `src/lib/branding.ts`
- Centralized brand constants: name, tagline, storage prefix, logo URL
- Export for use across components

### 5. Create `src/components/BrandLogo.tsx`
- RV monogram SVG component (white R + gold V on navy background)
- Wordmark variant with "Resu" in foreground + "Vibe" in primary/gold

### 6. Update `src/components/AppHeader.tsx`
- Replace plain text nav with BrandLogo component
- Apply font-body class

### 7. Create `public/favicon.svg`
- SVG favicon with RV monogram matching the brand

## Technical Details

The color system maps to shadcn's CSS variable pattern. All existing components (Button, Card, etc.) will automatically pick up the new colors since they reference the CSS variables. No component library changes needed.

Font loading via Google Fonts CDN in `index.html`. Tailwind `fontFamily` config ensures `font-heading` and `font-body` classes work throughout.

