

# UX Red Team Review: ResuVibe User Flow Audit

## Critical Findings & Prioritized Stories

After reviewing every page (Login, Onboarding, Applications list, NewApplication, ApplicationDetail, Profile, AppHeader), here are the issues grouped into epics by theme.

---

### Epic 1: First-Time User Experience (P0 — High Drop-off Risk)

**Story 1.1: Add empty-state guidance to ApplicationDetail tabs** (~3 pts)
When a user clicks into an application that errored or is still generating, the Job Description tab shows a wall of AI tools (JD Intelligence, Keyword Analysis, Summary Preview) even when there's no JD content. Each component should show a meaningful empty state ("No job description available — edit above to add one") rather than silently rendering nothing or erroring.

**Story 1.2: Profile completeness nudge on Applications page** (~2 pts)
If the user has no `resume_text` in their profile, the keyword analysis and resume optimization features silently fail or show unhelpful errors. Add a dismissible banner on the Applications list: "Complete your profile with a resume to unlock keyword matching and resume optimization."

**Story 1.3: Onboarding doesn't collect master cover letter** (~2 pts)
The onboarding wizard collects name, resume, skills — but skips the master cover letter, which the Profile page marks as important ("Add a master cover letter to improve quality"). Add an optional step 3.5 or fold it into the resume step.

---

### Epic 2: Navigation & Information Architecture (P1 — Usability)

**Story 2.1: ApplicationDetail tab order and naming confusion** (~3 pts)
The default tab is "Dashboard" but most users will want to review their Resume and Cover Letter first. The "Job Description" tab is overloaded — it contains JD Intelligence, Keyword Analysis, Summary Preview, Resume Diff, ATS Compliance, AND Bullet Coach. Restructure: split into "Resume" tab (diff, ATS, bullet coach, keyword gap) and "JD Analysis" tab (intelligence panel, raw JD text). Default to Cover Letter or Resume.

**Story 2.2: No way to navigate between applications without going back** (~2 pts)
Users must click "Back" to the list and then click another row. Add prev/next application navigation arrows in the ApplicationDetail header for sequential review workflows.

**Story 2.3: "Stories" nav link visible to all users** (~1 pt)
The internal story-tracking board is in the main nav for all users. It should be hidden behind an admin role check or a feature flag — regular users will be confused by it.

---

### Epic 3: Error Handling & Feedback (P0 — Trust)

**Story 3.1: No error recovery for failed generations** (~3 pts)
Applications with "Error" status show no retry button on the list page. Users must navigate into the detail view and find the Regenerate button. Add a "Retry" action directly in the Applications table row, and show the error message on hover.

**Story 3.2: Delete confirmation missing** (~2 pts)
The trash icon in the Applications list deletes immediately with no confirmation dialog. A single misclick destroys an application and all its generated content. Add an AlertDialog confirmation.

**Story 3.3: Generation progress not visible after page refresh** (~2 pts)
The `BackgroundGenerationManager` is an in-memory singleton. If the user refreshes the page, all in-progress job state is lost — rows show "Generating..." from the DB but the progress detail ("Scraping company branding...") is gone. Poll `generation_status` and show the DB-based stage in the status cell.

---

### Epic 4: Content Quality & Trust (P1 — Core Value)

**Story 4.1: Resume optimization says "Check the Resume tab" but there is no Resume tab** (~2 pts)
After keyword optimization, the toast says "Check the Resume tab" but ApplicationDetail only has Dashboard, Cover Letter, Job Description, and Details. The optimized `resume_html` is saved but there's no dedicated place to view it. Create a Resume tab with iframe preview, download PDF, and copy actions.

**Story 4.2: Fabrication review actions are toasts only — no persistence** (~3 pts)
The ResumeDiffViewer's Accept/Revert buttons fire toast notifications but don't actually modify the `resume_html`. The callbacks receive the change object but the parent only shows a toast. Wire Accept to keep the change and Revert to replace `tailored_text` with `baseline_text` in the stored HTML.

**Story 4.3: Cover letter doesn't use master cover letter or profile data** (~3 pts)
`streamTailoredLetter` receives only `jobDescription` — it doesn't pass the user's `master_cover_letter`, `preferred_tone`, skills, or experience from their profile. The cover letter is generic rather than personalized. Fetch profile data and pass it to the edge function.

---

### Epic 5: Mobile & Responsive Polish (P2 — Reach)

**Story 5.1: ApplicationDetail action bars overflow on mobile** (~2 pts)
The Dashboard tab has 5-6 action buttons (Refine, Regenerate, Copy HTML, Save Template, Download ZIP) in a `flex-wrap` layout that becomes hard to use on small screens. Consolidate into a primary action + overflow menu pattern.

**Story 5.2: Applications table not usable on narrow screens** (~2 pts)
The 6-column table (Company, Role, Status, Created, Updated, Actions) doesn't collapse for mobile. Hide Created/Updated columns below `md` breakpoint and make the Actions column a dropdown menu.

---

### Epic 6: Performance & Polish (P2)

**Story 6.1: ApplicationDetail polls every 10 seconds forever** (~2 pts)
`setInterval(() => loadApplication(id), 10000)` runs indefinitely, even after generation is complete. This is unnecessary network traffic. Only poll while `generation_status` is active, then stop.

**Story 6.2: Unsaved changes warning missing** (~2 pts)
Editing a cover letter or job description and then clicking "Back" or switching tabs discards changes with no warning. Add a `beforeunload` handler and an in-app prompt when navigating away with dirty state.

---

## Recommended Sprint Structure

**Sprint: "UX Red Team Fixes"** — 34 total points

| Priority | Epic | Stories | Points |
|----------|------|---------|--------|
| P0 | First-Time UX | 1.1, 1.2, 1.3 | 7 |
| P0 | Error Handling | 3.1, 3.2, 3.3 | 7 |
| P1 | Navigation/IA | 2.1, 2.2, 2.3 | 6 |
| P1 | Content Trust | 4.1, 4.2, 4.3 | 8 |
| P2 | Mobile Polish | 5.1, 5.2 | 4 |
| P2 | Performance | 6.1, 6.2 | 4 |

