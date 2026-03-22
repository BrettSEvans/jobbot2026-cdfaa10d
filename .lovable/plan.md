

## Plan: Expand style families to 6 with premium design guidance

### Current state
The system has a vague "be different" variability section injected into the prompt but no concrete style families. The user wants 6 distinct families, 2 of which feature charts/tables, with best-fit selection per document and forced family switching after 2+ regenerations.

### Changes

#### 1. Define 6 style families in `generate-material/index.ts`

| Family | Layout | Color Rule (60-30-10) | Typography Pairing | Signature Visual |
|--------|--------|----------------------|---------------------|-----------------|
| **A — Executive Bold** | Full-width dark header banner, single-column body | 60% white, 30% brand primary (header/accents), 10% accent pop | Montserrat headings + Lato body | Metric cards row (3-4 bold numbers) |
| **B — Modern Split** | Two-column 60/40 with colored sidebar | 60% white body, 30% sidebar in brand secondary, 10% primary accent | Bebas Neue headings + Roboto body | Sidebar quick-facts with icon markers |
| **C — Clean Contrast** | Single-column, alternating light/dark section bands | 60% neutral, 30% complementary color (NOT brand primary), 10% brand primary | Playfair Display headings + Garamond body | Whitespace-heavy with pull-quote callout |
| **D — Data Storyteller** | Header + compact data table + 2 bullet sections | 60% white, 30% brand primary, 10% warm accent | Montserrat headings + DM Sans body | **Styled HTML table** (3-4 rows, alternating row colors, colored header row) |
| **E — Visual Metrics** | Header + CSS chart row + 2 narrative sections | 60% light gray, 30% brand secondary, 10% bright accent | Bebas Neue headings + Lato body | **CSS progress bars or donut charts** (3-4 items, color-coded) |
| **F — Editorial Minimal** | Narrow-margin single column, magazine feel | 60% off-white, 30% dark charcoal, 10% single brand accent | Playfair Display headings + Source Sans Pro body | Large pull-quote + minimal icon bullets |

#### 2. Best-fit family selection logic
In the edge function, after receiving the asset name and description:
- Classify the document type (analytical → D/E, strategic → A/B, communication → C/F)
- Check which families siblings already used → exclude them
- Select the best remaining match
- If all families used, pick least-used

#### 3. Forced family switch after 2+ regenerations
- The client already tracks revisions via `generated_asset_revisions`
- On regeneration, pass a `regenerationCount` to the edge function (count revisions for that asset_id)
- If `regenerationCount >= 2`, the edge function excludes the current family and picks a different one
- This ensures the user sees a fresh visual approach

#### 4. Inject premium design rules into every family prompt
Each family prompt block will include:
- **White space**: "Embrace empty space — give every element breathing room"
- **Grid system**: Specific column layout for that family
- **Text breaking**: "No paragraph longer than 3 sentences. If it looks like a wall of text, cut 20%."
- **Typography**: Specific Google Fonts pairing with `<link>` tag
- **60-30-10 color allocation**: Exact colors mapped to specific element types
- **Icons over bullets**: "Replace standard bullet points with minimal Unicode icons (▸, ◆, ●) or CSS-styled markers"
- **Data visualization**: For families D/E, mandatory chart/table; for others, optional single metric element

#### 5. Client-side: pass regeneration count
Update `DynamicMaterialsSection.tsx` regeneration handler to:
- Count existing revisions for the asset before calling the edge function
- Pass `regenerationCount` in the request body

#### 6. Client-side: pass regeneration count from background generator
Update `src/lib/backgroundGenerator.ts` to pass `regenerationCount: 0` on first generation (no change needed — it's always 0 on first run).

### Files to modify
- `supabase/functions/generate-material/index.ts` — family definitions, selection logic, prompt injection, accept `regenerationCount`
- `src/components/DynamicMaterialsSection.tsx` — count revisions and pass `regenerationCount`
- `src/lib/backgroundGenerator.ts` — pass `regenerationCount: 0` on initial generation

### Expected outcome
- Each material gets a visually distinct, premium-designed document
- Two families (D, E) always include charts or tables as their signature element
- Typography and color schemes vary across families
- Regenerating 2+ times forces a new visual family
- All documents follow the 60-30-10 color rule, white space philosophy, and short-text discipline

