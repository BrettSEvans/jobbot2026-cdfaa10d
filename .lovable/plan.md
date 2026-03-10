

## Changes

Two small updates to `AssetActionBar.tsx`:

1. **Hide "Copy Text" for industry assets** — The `onCopy` prop is already conditional (`{hasContent && onCopy && ...}`), so the fix is to stop passing `onCopy` from `DynamicAssetTab.tsx` (line 304). Resume and Cover Letter tabs already pass it and will keep it.

2. **Rename "Edit HTML" to "Edit Text"** — In `AssetActionBar.tsx` line 168, change the label from `"Edit HTML"` to `"Edit Text"` (and `"Cancel Edit"` stays the same). This applies to Resume and Cover Letter; industry assets don't use this button.

### Files

**`src/components/DynamicAssetTab.tsx`** — Remove `onCopy={handleCopyText}` prop from the `<AssetActionBar>` call (~line 304).

**`src/components/tabs/AssetActionBar.tsx`** — Line 168: change `"Edit HTML"` to `"Edit Text"`.

