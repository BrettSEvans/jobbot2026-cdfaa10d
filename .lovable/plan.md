

## Plan: Generate Professional Mockup Images for Landing Page

The current 5 mockup images in `src/assets/` contain AI artifacts. We'll replace them with newly generated, high-quality images using the Nano banana pro model (`google/gemini-3-pro-image-preview`).

### Images to Generate (5 total)

Each will be prompted as a realistic, professional document screenshot with ResuVibe branding:

1. **mockup-resume.jpg** — A tailored resume document with clean typography, sections for experience/skills/education, subtle company branding accents
2. **mockup-cover-letter.jpg** — A formal cover letter with professional letterhead styling, body paragraphs, signature area
3. **mockup-dashboard.jpg** — An executive dashboard with charts, KPI cards, branded header bar, data visualizations
4. **mockup-roadmap.jpg** — A 90-day roadmap with timeline/phases, milestones, branded color scheme
5. **mockup-custom-asset.jpg** — A custom industry asset (e.g., a RAID log or strategic analysis) with tables/sections

### Technical Approach

1. Create a small edge function or client-side script that calls the image generation API for each mockup
2. Download the generated base64 images
3. Save them as replacement files in `src/assets/` (same filenames so no import changes needed)
4. No changes to `Landing.tsx` required since filenames stay the same

### Prompt Strategy

Each prompt will specify:
- A flat-lay or screen-capture style view of a professional document
- Clean, modern design with warm accent colors (matching ResuVibe's brand palette)
- Realistic text content (not lorem ipsum) related to job applications
- High resolution suitable for web display at card size (~320px wide, ~208px tall crop)

