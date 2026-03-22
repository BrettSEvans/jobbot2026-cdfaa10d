

## Plan: Enhance Asset Review Carousel — Full Material Coverage + Multi-Select Filter

### Problem
1. **Missing granularity**: All `generated_assets` are lumped under one "Custom Material" filter option, so you can't filter by individual dynamic material types (e.g., "90-Day Plan", "Stakeholder Map", etc.)
2. **Single-select type filter**: Can only view one asset type at a time — need multi-select to compare across types

### Changes (single file: `src/components/admin/AssetReviewCarousel.tsx`)

**1. Use individual `asset_name` values as filter keys for generated assets**
- Instead of mapping all generated_assets to `"generated_asset"` in the type filter, derive the filter key from `asset_name` for generated assets (e.g., `"generated_asset::90-Day Plan"`)
- Update `ASSET_TYPE_LABELS` dynamically from the actual asset names found in the data
- This ensures every unique material type appears as its own filterable option

**2. Replace single-select type filter with multi-select toggle chips**
- Remove the `Select` dropdown for asset type
- Replace with a row of clickable `Badge`/`Button` chips — one per asset type found in the data
- Clicking a chip toggles it on/off; multiple can be active simultaneously
- An "All" chip selects/deselects everything
- Store selected types as a `Set<string>` instead of a single string

**3. Keep review status filter as single-select** (mutually exclusive states — makes sense as-is)

### Technical Details
- `typeFilter` state changes from `string` to `Set<string>`
- Filter logic: if set is empty or contains all types, show everything; otherwise filter to matching types
- Generated assets use `assetType` = `"generated_asset::${asset_name}"` for filtering but keep `"generated_asset"` for the `needsScripts` check and review key compatibility
- Add a `filterType` field to `FlatAsset` to separate display filtering from the persisted `assetType`
- Chips use `variant="default"` when selected, `variant="outline"` when not

