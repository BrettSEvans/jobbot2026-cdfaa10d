## Plan: Dashboard as Premium Industry Asset with Download-Locking

This is a significant restructuring of the dashboard feature. Here's what changes and why.

### What Changes

**1. Remove Dashboard from Auto-Generation Pipeline**

- In `src/lib/backgroundGenerator.ts` (`runPipeline`), remove step 5 (dashboard generation, lines ~273-311) and remove `dashboard_html`/`dashboard_data` from the final save (lines ~460-464)
- Remove dashboard-related imports (`streamDashboardGeneration`, `parseLlmJsonOutput`, `assembleDashboardHtml`)
- Reduce `totalAssets` from 5 to 4 (or dynamically count based on `selected_assets`)
- Remove `"dashboard"` status from GenerationJob type

**2. Move Dashboard to Premium-Only**

- In `src/lib/subscriptionTiers.ts`: remove `"dashboard"` from the Pro tier's `allowedAssets` array and keep it only in Premium
- In `src/pages/ApplicationDetail.tsx`: remove "Dashboard" from `primaryTabs` — it will appear as an industry asset instead
- The `UpgradeGate` on the detail page already checks `isAssetAllowed("dashboard")`, so gating is automatic once the tier config changes

**3. Include Dashboard as an Industry Asset Option**

- The `propose-assets` edge function (`supabase/functions/propose-assets/index.ts`) generates 6 suggestions. Update its prompt to potentially include "Interactive Dashboard" as one of the proposals when the user is premium
  &nbsp;
- The `AssetProposalCard` and asset selection flow already handle this — dashboard just becomes another option in the proposal list
- add it to the list of benefites if a user upgrades to premium

**4. Add Hosting Help Info on Completed Dashboard**

- In `DashboardTab.tsx` (or wherever the dashboard renders after generation), add an info card/tooltip that appears when the dashboard is complete
- Text: "To share this dashboard, download the files and host them on a free static site like [https://pages.edgeone.ai/drop](https://pages.edgeone.ai/drop)"
- Use an `Info` or `HelpCircle` icon button alongside the download button

**5. Track Downloads & Lock Regeneration/Swap After Download**

- Add a `downloaded_at` column (nullable timestamp) to the `generated_assets` table via migration
- Also add a `dashboard_downloaded_at` column to `job_applications` for the dashboard specifically (since dashboard currently lives on `job_applications.dashboard_html`)
- Actually, since we're moving dashboard into the `generated_assets` flow, we only need `downloaded_at` on `generated_assets`
- When a user downloads (ZIP or HTML), update `downloaded_at` on the asset record
- In `DynamicAssetTab.tsx`: if `downloaded_at` is set, disable "Regenerate", "Refine with AI", and hide the `ChangeAssetDialog` swap button
- Show a message: "This asset has been downloaded. Create a new application to generate fresh assets."

### Database Migration

```sql
ALTER TABLE public.generated_assets 
ADD COLUMN downloaded_at timestamptz DEFAULT NULL;
```

### Files to Modify


| File                                         | Change                                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/subscriptionTiers.ts`               | Remove `"dashboard"` from Pro tier's `allowedAssets`                                                                                |
| `src/lib/backgroundGenerator.ts`             | Remove dashboard generation step from pipeline                                                                                      |
| `src/pages/ApplicationDetail.tsx`            | Remove Dashboard from primary tabs; it becomes an industry asset                                                                    |
| `src/components/DynamicAssetTab.tsx`         | Add download-locking logic (disable regen/refine/swap when `downloaded_at` is set); add hosting help info for dashboard-type assets |
| `src/components/ChangeAssetDialog.tsx`       | Respect `downloaded_at` lock                                                                                                        |
| `src/components/tabs/DashboardTab.tsx`       | May be repurposed or removed (dashboard now rendered via `DynamicAssetTab`)                                                         |
| `src/lib/api/dynamicAssets.ts`               | Add `downloaded_at` to `GeneratedAsset` interface; add `markAssetDownloaded()` function                                             |
| `supabase/functions/propose-assets/index.ts` | Optionally include "Interactive Dashboard" in proposals                                                                             |
| `src/components/AssetProposalCard.tsx`       | No major changes needed — already handles 6 proposals / 3 selections                                                                |
| `src/pages/NewApplication.tsx`               | Remove dashboard preview step if present                                                                                            |


### Key Decisions

- Dashboard moves from a "primary tab" to an industry asset managed through the same `generated_assets` table and `DynamicAssetTab` component
- Download-locking applies to ALL dynamic/industry assets (not just dashboard) — this enforces the "pay for more" model
- The dashboard generation uses the existing `generate-dashboard` edge function but is triggered through the dynamic asset flow