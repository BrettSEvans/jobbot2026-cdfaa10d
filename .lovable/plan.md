

## Plan: Add Company Icons to Asset Review Carousel

### What
Replace the generic `Building2` icon next to company names in the carousel header with the actual `CompanyIcon` component (which fetches real logos via Clearbit with letter-avatar fallback).

### Changes (single file: `src/components/admin/AssetReviewCarousel.tsx`)

1. **Expand the Supabase query** to also select `company_url` and `company_icon_url` from `job_applications`
2. **Add fields to `FlatAsset`** type: `companyUrl` and `companyIconUrl`
3. **Populate those fields** when building the flat asset list (both inline types and generated assets)
4. **Import `CompanyIcon`** and replace the `<Building2>` icon + text span with `<CompanyIcon companyName={...} companyUrl={...} iconUrl={...} size="sm" />`

This reuses the existing multi-tier logo resolution (saved icon → Clearbit domain lookup → Clearbit name guess → letter fallback) that already works on the Applications list page.

