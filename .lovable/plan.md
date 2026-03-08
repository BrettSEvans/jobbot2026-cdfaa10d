

## Plan: Move ATS Card Into Resume View Only + UI/UX Critique & Fixes

### Problem
The ATS card currently sits above the tab bar (line 332), visible on **every** view (Cover Letter, Resume, Industry Materials). It's only relevant when viewing the resume.

### UX Critique
1. **Wrong placement**: ATS analysis is resume-specific but sits at page-level, cluttering Cover Letter and other views
2. **Visual weight**: The circular gauge + sidebar dashboard takes significant vertical space even when collapsed — it pushes the actual content down
3. **Redundant header elements**: "Resume Health Score" label + Target icon appear twice (collapsed and expanded states)
4. **Collapsed state is too busy**: Score gauge, label badge, delta badge, keyword counts, parse rate — too much info crammed into one line
5. **Sidebar navigation wastes space on mobile**: 130px fixed sidebar eats into narrow screens

### Changes

**`src/pages/ApplicationDetail.tsx`**
- Remove the ATS card from lines 332-341 (above the tab bar)
- Move ATS card rendering **inside** the `activeView === "resume"` block, placing it directly above the `HtmlAssetTab` component
- This means ATS card only renders when the user is on the Resume tab

**`src/components/AtsScoreCard.tsx`** — UI polish:
- **Collapsed state**: Simplify to just score number + color bar + delta badge + expand chevron. Remove the large circular gauge from collapsed — use a compact inline score pill instead
- **Mobile sidebar**: Switch from fixed 130px sidebar to horizontal pill tabs when screen is narrow (`flex-col sm:flex-row` layout for the expanded dashboard)
- **Score label cleanup**: Single "Resume Health" heading, remove duplicate Target icons
- **Better empty state**: Add a brief explanation of what the scan does ("Analyze your resume against the job description")
- **Applied fix feedback**: After applying a bullet fix, show a toast confirmation instead of just inline text

### Files

| File | Change |
|---|---|
| `src/pages/ApplicationDetail.tsx` | Move ATS card from page-level into resume tab content area |
| `src/components/AtsScoreCard.tsx` | Simplify collapsed state, mobile-friendly expanded layout, cleaner empty state |

