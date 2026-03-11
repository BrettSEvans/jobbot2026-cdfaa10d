

## Improve "Trusted by Professionals" Social Proof Section

### Current Issues
- Stats are plain text with no visual containment -- they float and lack weight
- Review cards are uniform and flat -- no visual hierarchy or differentiation
- The aggregate badge between stats and reviews creates awkward spacing
- No visual separation between the stats zone and the reviews zone
- Avatar circles are small and generic

### Redesign

**File: `src/pages/Landing.tsx`** -- Rework the `SocialProof` component:

1. **Stats bar**: Wrap each stat in a subtle card with a soft background (`bg-muted/50 rounded-2xl p-6`), add a small colored icon above each number (Trophy, FileText, Star, Zap) to give each stat visual identity and scanability. Make numbers larger (`text-5xl`).

2. **Move aggregate badge above reviews as a section divider**: A horizontal rule with the star badge centered on it (pill shape, `bg-background` over a `border-t`), creating clear visual separation.

3. **Review cards polish**:
   - Increase avatar size to `h-11 w-11` with a gradient background
   - Add a subtle top-border accent in primary color on the highlighted/center card
   - Add a quote icon (lucide `Quote`) in the top-right corner of each card at low opacity for visual texture
   - Slightly larger quote text (`text-base`) for readability
   - Company name as a `Badge` variant="outline" instead of plain text

4. **Background**: Add the `noise-texture` class and a subtle gradient to the section for depth, consistent with other sections.

5. **Add stat icons**: Import `Trophy`, `Users` from lucide-react. Each stat gets a small icon above it for visual anchoring.

### Single file change
- `src/pages/Landing.tsx` -- update `STATS` data, `SocialProof` component layout and styling

