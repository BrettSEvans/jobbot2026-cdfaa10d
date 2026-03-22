

# Add Style Variability Metric

## Overview

Add a **style variability** dimension to the existing design variability scoring system. This metric specifically evaluates the **content flow pattern** of each document (e.g., "text block → chart → text block → bullet points" vs. "header → two-column grid → metrics cards → timeline") and penalizes documents that share similar content-block sequencing or layout formats (e.g., multiple documents using two-column format).

## Changes

### 1. Update the scoring edge function prompt (`supabase/functions/score-design-variability/index.ts`)

Expand the AI evaluation criteria to include a dedicated **style variability** analysis:
- **Content flow pattern**: Extract the sequence of content block types in each document (e.g., "header → paragraph → table → bullet list → chart")
- **Column layout detection**: Identify whether documents use single-column, two-column, sidebar, or grid layouts
- **Visual rhythm**: Assess spacing patterns, section density, and content block sizing
- Add a new `styleScore` (0-100) to the JSON response schema
- Add `contentFlowPatterns` array showing each document's detected flow sequence (e.g., `{ assetName: "...", flowPattern: "header → two-column-grid → metrics-cards → bullet-list", layoutType: "two-column" }`)
- Include style-specific recommendations when documents share similar flow patterns

### 2. Update TypeScript types (`src/lib/api/designVariability.ts`)

Add to `VariabilityResult`:
- `styleScore: number`
- `contentFlowPatterns: Array<{ assetName: string; flowPattern: string; layoutType: string }>`

Map these from the edge function response.

### 3. Update the UI card (`src/components/admin/DesignVariabilityCard.tsx`)

- Add the `styleScore` as a third metric alongside Variety and Branding
- Display the content flow patterns section showing each document's detected pattern and layout type
- Use color coding to highlight documents with similar patterns (indicating low variability)

### 4. Feed style patterns into generation (`supabase/functions/generate-material/index.ts`)

Enhance the existing variability section in the generation prompt to include content flow awareness:
- Extract the content block sequence from each existing asset (not just HTML tag hierarchy)
- Tell the AI to use a different content flow pattern (e.g., if existing docs use "header → paragraph → table → bullets", the new doc should use "header → metrics grid → timeline → callout box")
- Explicitly list layout types already used (two-column, single-column, sidebar) so the AI avoids repeating them

### Files to modify
- `supabase/functions/score-design-variability/index.ts` — expanded prompt with style analysis
- `src/lib/api/designVariability.ts` — new type fields
- `src/components/admin/DesignVariabilityCard.tsx` — display style score + flow patterns
- `supabase/functions/generate-material/index.ts` — content flow awareness in generation prompt

