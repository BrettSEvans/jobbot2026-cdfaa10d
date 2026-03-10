# Prompt Log

All user prompts submitted to Lovable for this project, tracked for reference and reproducibility.

---

| # | Date | Prompt | Category | Outcome |
|---|------|--------|----------|---------|
| 1 | 2026-03-08 | Log in to the app in the preview, then navigate to Admin → QA Suite tab to verify all test cases use the updated terminology. | QA / Verification | Navigated to auth page; awaited user login |
| 2 | 2026-03-08 | I've logged in. Please navigate to Admin → QA Suite and verify all test cases use 'materials' and 'Vibe Edit' terminology. | QA / Verification | Confirmed 0 stale "asset" refs, 3 Vibe Edit tests present |
| 3 | 2026-03-08 | On the homepage, some of the assets, the materials that are shown as examples still have the coloring from before the rebranding. Please update the coloring, the CSS of those images and make sure they represent the CSS of ResuVibe. | Design / Branding | Regenerated 5 mockup images with amber/indigo palette |
| 4 | 2026-03-08 | Can you put all of my prompts from this project into a table | Meta / Documentation | Provided table of visible prompts; noted history limitation |
| 5 | 2026-03-08 | Create a docs/PROMPT_LOG.md file to start tracking all prompts going forward in a structured table format | Meta / Documentation | Created this file |
| 6 | 2026-03-08 | When I try to regenerate an asset on desktop, I only see four options, the rest are below the fold with no scrolling | Bug Fix / UX | Fixed ScrollArea height constraint in ChangeAssetDialog |
| 7 | 2026-03-08 | The "Everything You Need to Stand Out" section has reports all from a TPM job function. Vary materials to show more breadth of job functions. | Content / Landing Page | Diversified feature descriptions across sales, healthcare, finance, education, retail, manufacturing, marketing |
| 8 | 2026-03-09 | Give me a design doc for the help functionality and one for the user tour functionality. The intent is to recreate them in another lovable app. Provide the prompts to remake these in another app as well. The prompt should reference the design docs. Give meticulous detail from both a senior engineer, senior UX designer and senior product manager. | Documentation / Architecture | Created DESIGN_DOC_HELP_SYSTEM.md, DESIGN_DOC_TUTORIAL_TOUR.md, and RECREATION_PROMPTS.md |
| 9 | 2026-03-10 | The prompt guide is not updating with every prompt. Make this happen. | Feature / Admin | Cancelled by user |
| 10 | 2026-03-10 | Verify the prompt guide is updating with every prompt. Make this happen if not. Create a table for an admin to review prompts. | Feature / Admin | Created prompt_log DB table with RLS, AdminPromptLogTab UI, seeded 7 entries |
| 11 | 2026-03-10 | (Plan approval) Prompt Log Database Table and Admin UI | Feature / Admin | Executed plan: migration + admin tab + sidebar entry |
