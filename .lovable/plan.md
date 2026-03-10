

# Plan: Replace Thunderbolt (Zap) with BrandLogo & Centralize Usage

## Problem
The `PendingApproval` page uses a `Zap` icon next to the brand name — a leftover from an old design. Other pages also use `Zap` as a generic action icon. The logo usage should be centralized via the existing `BrandLogo` component.

## Audit Results

`Zap` usage across the app:

| File | Usage | Action |
|------|-------|--------|
| `PendingApproval.tsx` | Brand header (Zap + brand name) | **Replace with `<BrandLogo />`** |
| `Applications.tsx` | Empty-state CTA button icon + feature list item | Keep — these are action/feature icons, not branding |
| `AtsScoreCard.tsx` | "Scan" button icon | Keep — action icon |
| `Pricing.tsx` | Free tier icon | Keep — tier indicator |

## Changes

### 1. Fix `PendingApproval.tsx`
Replace the hand-coded Zap + text brand header with the shared `<BrandLogo />` component:

```tsx
// Before:
<Zap className="h-6 w-6 fill-primary text-primary" />
<span className="text-xl font-heading ...">{BRAND.name}</span>

// After:
<BrandLogo size="md" />
```

Remove the `Zap` import.

### 2. No other branding instances to fix
- `Auth.tsx` and `Landing.tsx` already use `<BrandLogo />` correctly.
- Remaining `Zap` usages are legitimate action/feature icons, not brand representations.

This is a single-file, surgical fix. The `BrandLogo` component is already the centralized logo — `PendingApproval` was the only page not using it.

