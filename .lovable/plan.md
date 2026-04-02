

## Plan: Inline Variability Check During Material Generation

### Problem
Design variability scoring currently runs **after** all materials are built. If scores are low, the assets are already finalized and can't be adjusted without manual regeneration.

### Approach
After the **first asset** completes, run a variability pre-check using the first asset's HTML plus a **design-only summary** of the second asset (generated via a lightweight AI call). If the variability score is below the threshold (70), inject the variability `recommendations` into the remaining assets' generation calls. This check runs **once per generation** to avoid loops.

### Flow

```text
Current:  Asset1 → Asset2 → Asset3 → ... → AssetN → Variability Score (post-hoc)

Proposed: Asset1 (build) → Asset2 (design-only sketch) →
          Variability Check (Asset1 HTML + Asset2 sketch) →
          If score < 70: inject recommendations into Asset2..N requests →
          Asset2 (build with guidance) → Asset3..N (build with guidance) →
          Final Variability Score (for display)
```

### Changes

**1. `src/lib/backgroundGenerator.ts`** — Restructure the material generation loop (lines ~467-580):
- Build Asset 1 (the first task) **alone** and wait for it to complete
- Generate a lightweight "design sketch" for Asset 2 by calling `score-design-variability` with Asset 1's HTML + Asset 2's name/description (the variability endpoint already accepts asset structures)
- Actually, better: call a new lightweight endpoint or reuse the existing `score-design-variability` function by sending Asset 1 HTML and a **mock structural summary** for Asset 2 based on its name — but that won't work because Asset 2 doesn't exist yet.

**Revised approach**: Build Asset 1 alone. Then build Asset 2 alone. After both are complete, run variability scoring on just those two. If score < 70, capture `recommendations` and pass them to Assets 3..N. This is simpler, still catches problems early (after 2 of 6+ assets), and uses the existing scoring function as-is.

```text
Asset1 (build) → Asset2 (build) →
Variability Check (Asset1 + Asset2) →
If overallScore < 70: capture recommendations →
Assets 3..N (build in pool of 3, with variabilityRecommendations injected) →
Final Variability Score
```

**Specific changes in `backgroundGenerator.ts`**:
- Split `recommendedAssets` into `firstBatch` (first 2) and `remainingBatch` (rest)
- Build first 2 sequentially or in a pool of 2
- After both complete, fetch their HTML from DB, call `scoreDesignVariability`
- If `overallScore < 70`, store `recommendations` array
- Pass `variabilityRecommendations` in the request body for remaining assets
- Run remaining assets through `runWithConcurrency(tasks, 3, 1000)` as before
- Keep the final variability scoring at the end (now covers all assets)

**2. `supabase/functions/generate-material/index.ts`** — Use the already-destructured `variabilityRecommendations` field:
- If `variabilityRecommendations` is a non-empty array, append a new prompt section after the existing `existingPatternsSection` that says: "A design variability analysis flagged the following issues with previously generated assets. You MUST address these in your design:" followed by the recommendations as bullet points.

### Threshold & loop protection
- Variability threshold: `overallScore < 70` triggers guidance injection
- The check runs exactly **once** — after the first 2 assets, before the rest
- No retry or re-generation of assets 1-2; they stay as-is
- If there are only 2 or fewer total assets, skip the mid-generation check entirely (the post-hoc score still runs)

### What stays the same
- The `score-design-variability` edge function is unchanged
- The final variability scoring after all assets complete remains (for the UI card)
- The concurrency pool logic (`runWithConcurrency`) is unchanged
- Dashboard generation flow is unaffected
- No database changes needed

