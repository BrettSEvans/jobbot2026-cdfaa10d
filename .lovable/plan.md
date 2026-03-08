

## Plan: Add Toast on Locked Asset Interaction

**File:** `src/components/DynamicAssetTab.tsx`

Replace the `UpgradePopover` wrapper approach with a simpler pattern: when a free user clicks any locked button (Vibe Edit, Regenerate, PDF Download, Copy to Text), show a toast notification saying the feature requires an upgrade, with a clickable action button that navigates to `/pricing`.

- Remove the `UpgradePopover` component
- For each locked button, add an `onClick` handler that fires a toast with:
  - Title: "Upgrade Required"
  - Description: "This feature is available with a Pro or Premium subscription. Would you like access?"
  - Action button: "View Plans" → navigates to `/pricing`
- Keep the `Lock` icon on buttons to visually indicate they're gated
- Keep buttons visually styled (not fully disabled) so they're clickable to trigger the toast

