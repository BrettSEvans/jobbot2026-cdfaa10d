

## Add ATS Score Usage Instructions to Help System

The `ats-score` help entry in `src/lib/helpEntries.ts` has a summary and tips but is missing:
1. **`steps`** — step-by-step instructions telling users how to use the feature
2. **`route`** — so it auto-surfaces on the Application Detail page

### Change (single file: `src/lib/helpEntries.ts`, lines 435-446)

Update the `registerHelp` call for `ats-score` to include:

- **`route: '/applications/:id'`** — contextually appears on the detail page
- **`steps`** array with clear user instructions:
  1. Open any application from your Applications list
  2. Generate a resume first (the ATS card only appears once a resume exists)
  3. Find the "ATS Match Score" card below the resume section
  4. Click the refresh/rescan button to score your resume against the job description
  5. Expand the card (chevron) to see matched keywords, missing keywords, and improvement suggestions
  6. Refine your resume using the suggestions, then rescan to see your updated score

This is a single-field addition to an existing `registerHelp()` call — no new files or structural changes needed.

