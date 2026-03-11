## Revised Plan: Portfolio Thumbnail Mockups with 85% Uniqueness

### Goal

Replace the 5 static `.jpg` thumbnails in "Your Portfolio, Visualized" with self-contained HTML documents rendered as iframe thumbnails. Each document must be visually and structurally **85%+ unique** from the others — different layouts, color applications, typography hierarchies, and data presentation patterns — to showcase ResuVibe's breadth.

### Brand Colors (applied consistently across all 5)

- **Amber**: `hsl(36, 90%, 50%)` → `#E8A317`
- **Navy**: `hsl(234, 45%, 52%)` → `#4A52A0`

### Fictitious Candidate

**Jordan A. Castillo** · (415) 555-0247 · [jordan.castillo@email.com](mailto:jordan.castillo@email.com) · linkedin.com/in/jordancastillo

### Content Sources (from real brettevanssf jobs/personas)

Based on actual applications: Appen Sr. TPM, DoorDash TPM, BetterUp TPM, Linktree Dir. of Engineering, UP Academy Head of School. Real bullet points adapted with fictitious name/contact.

### Uniqueness Strategy — 5 Distinct Layout Archetypes

Each document uses a **completely different structural pattern** to maximize visual diversity:

```text
Doc              Layout Archetype     Primary Structure        Amber/Navy Usage
─────────────────────────────────────────────────────────────────────────────────
1. Resume        Classic Columnar     Left sidebar + right     Navy sidebar bg,
                                      body, horizontal rules   amber name accent
                                                               
2. Cover Letter  Editorial Letter     Single-column prose,     Amber top border
                                      large signature block,   line, navy heading
                                      pull-quote callout       block

3. Dashboard     Data Grid + KPIs    4 KPI cards → 2-col      Amber KPI values,
                                      chart area → table,      navy card headers
                                      MD3-inspired cards       & progress fills

4. Roadmap       Swim-Lane Timeline  Horizontal Gantt-style   Amber milestones,
                                      grid with dept lanes,    navy lane headers
                                      phase columns            & grid lines

5. Risk matrix   Magazine Scorecard  Risk cards in 2×2 grid   Amber severity
                                      + sidebar metrics,       badges, navy
                                      editorial two-column     section headers
```

### Uniqueness Breakdown (targeting 85%+)


| Dimension             | How uniqueness is enforced                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Layout**            | Sidebar, single-col, grid, swim-lane, magazine — zero overlap                                                    |
| **Typography**        | Each uses a different Google Font pairing (Inter, Roboto Condensed, Playfair+Source Sans, DM Sans, Merriweather) |
| **Data presentation** | Bullets → prose → KPI cards → Gantt bars → scorecard cells                                                       |
| **Color ratio**       | Each doc inverts the amber/navy ratio differently                                                                |
| **Visual anchors**    | Name header → letterhead block → metric row → timeline bar → risk matrix                                         |


### Files to Create

1. `**public/mockups/resume.html**`
  - Two-column layout: navy sidebar (contact, skills, certifications) + white main body
  - Tailored to Appen Sr. TPM role content
  - Font: Inter · Amber used for name and section dividers
2. `**public/mockups/cover-letter.html**`
  - Single-column editorial letter with amber 4px top accent border
  - Navy name block header, company address, formal greeting
  - Pull-quote callout mid-letter with amber left border
  - Tailored to DoorDash TPM content · Font: Playfair Display + Source Sans Pro
3. `**public/mockups/dashboard.html**`
  - MD3-inspired: 4 KPI cards in flex row → 2-column area (chart placeholder + summary table) → recommendations section
  - Navy card header strips, amber metric values and progress bar fills
  - Tailored to BetterUp TPM · Font: Roboto
4. `**public/mockups/roadmap.html**`
  - Horizontal swim-lane Gantt grid: department rows × 3 phase columns (Days 1-30, 31-60, 61-90)
  - Navy grid headers and lane labels, amber milestone markers and status dots
  - Tailored to Linktree Dir. of Engineering · Font: DM Sans
5. `**public/mockups/custom-asset.html**` (RAID Log)
  - Magazine/scorecard hybrid: 2×2 grid of R/A/I/D category cards + right sidebar with summary metrics
  - Amber severity badges (High/Med/Low), navy category headers
  - Tailored to UP Academy Head of School · Font: Merriweather + Inter

### File to Edit

6. `**src/pages/Landing.tsx**`
  - Remove 5 `.jpg` image imports (lines 6-10)
  - Replace `EXAMPLES` array to reference `/mockups/*.html` paths
  - Replace `<img>` tags with `<iframe>` thumbnails:
    - Container: `h-52 w-full overflow-hidden relative`
    - Iframe: `w-[800px] h-[1040px] origin-top-left scale-[0.25] pointer-events-none border-0`
    - This renders each 800px doc scaled to ~200px thumbnail width
  - Keep existing card wrappers, labels, and hover effects

### Why This Impresses Customers

- Shows 5 **completely different document types** with distinct visual DNA
- Proves ResuVibe doesn't just swap text in templates — it generates unique, industry-appropriate documents
- Real professional content (adapted from actual TPM/education/engineering applications) demonstrates domain versatility
- Consistent brand thread (amber + navy) across all 5 shows cohesive quality despite structural variety