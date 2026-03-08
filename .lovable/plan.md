

## Plan: Free Tier Preview Assets with Watermark & Upgrade Gate

### Summary
When free-tier users generate a resume, automatically generate 3 job-specific "preview" assets that are:
1. **View-only** — Edit, Vibe Edit, Copy disabled with upgrade tooltip
2. **Watermarked** — "ResuVibe" diagonal watermark repeated across the document
3. **Upgrade-gated** — Clicking locked buttons shows tooltip + redirects to pricing

### Technical Approach

#### 1. Auto-Generate Preview Assets for Free Users
**File:** `src/lib/backgroundGenerator.ts`
- After resume generation completes in `runPipeline()`, check if user is free tier
- If free, call `proposeAssets()` to get 3 suggested assets and generate them with watermark flag
- Store `is_preview: true` metadata on the asset or infer from tier at render time

#### 2. Add Watermark Injection Utility
**New File:** `src/lib/watermarkHtml.ts`
```typescript
export function injectWatermark(html: string): string {
  // Inject CSS with repeated diagonal "ResuVibe" watermark overlay
  // Uses ::before pseudo-element on body with repeating SVG pattern
}
```

#### 3. Modify Dynamic Asset Edge Function
**File:** `supabase/functions/generate-dynamic-asset/index.ts`
- Accept optional `applyWatermark` boolean parameter
- If true, inject watermark CSS into generated HTML before returning

#### 4. Update DynamicAssetTab with Free-Tier Restrictions
**File:** `src/components/DynamicAssetTab.tsx`
- Accept new prop `isPreviewOnly: boolean`
- When `isPreviewOnly`:
  - Disable Vibe Edit, Regenerate, Copy buttons
  - Wrap buttons with Tooltip showing "Available with an upgrade. Would you like access?"
  - On "Yes" (clicking the tooltip trigger), navigate to `/pricing`
- Apply watermark to iframe `srcDoc` if preview mode

#### 5. Wire Up in ApplicationDetail
**File:** `src/pages/ApplicationDetail.tsx`
- Pass `isPreviewOnly={tier === "free"}` to `DynamicAssetTab`
- Auto-trigger asset generation after resume is done (for free users)

#### 6. Remove Watermark on Upgrade
- When rendering assets, check `tier !== "free"` to skip watermark injection
- Optionally regenerate assets when tier changes (or just render without watermark)

### Database Changes
**None required** — use existing `generated_assets` table; tier check happens at render time

### UI Behavior

| Button | Free (Preview) | Pro/Premium |
|--------|----------------|-------------|
| Vibe Edit | Disabled + tooltip | Enabled |
| Regenerate | Disabled + tooltip | Enabled |
| Copy to Text | Disabled + tooltip | Enabled |
| PDF Download | Disabled + tooltip | Enabled |
| View iframe | Watermarked | Clean |

### Watermark Design
- Diagonal repeating "ResuVibe" text at ~45° angle
- 20% opacity, covers entire viewport
- CSS-only (no image dependency)
- Injected via `<style>` tag in HTML head

### Files to Modify
1. `src/lib/backgroundGenerator.ts` — auto-generate preview assets for free users
2. `src/lib/watermarkHtml.ts` (new) — watermark injection utility
3. `src/components/DynamicAssetTab.tsx` — lock buttons + watermark for free tier
4. `src/pages/ApplicationDetail.tsx` — pass preview flag, trigger auto-generation
5. `supabase/functions/generate-dynamic-asset/index.ts` — optional watermark injection

