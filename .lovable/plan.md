

# QA Testing Page — UX Review & Improvement Plan

## Critical Issues

### 1. No Progress Indicator / Completion Bar
The page shows raw counts (pass/fail/skip) but lacks a visual progress bar showing overall completion percentage. In Jira Test Management, progress is front-and-center. Without it, a QA lead cannot glance at the page and know "we're 60% through this run."

**Fix:** Add a segmented progress bar (green/red/yellow/gray) at the top of the active run card, showing pass/fail/skip/untested as proportional segments with a percentage label.

### 2. Test Steps Always Expanded — Information Overload
Every test case card permanently displays its steps and expected results. With 46 tests, this creates massive vertical scroll. Jira and TestRail collapse test details by default and expand on click.

**Fix:** Collapse steps/expected results by default inside each `TestCaseCard`. Show only the title, tags, time estimate, and result buttons. Add a small expand toggle to reveal details on demand.

### 3. No "Untested" Filter or Status
There is no way to filter to only untested cases. A tester resuming a session has to scroll through all 46 tests scanning for missing results. This is the most common filter in any test management tool.

**Fix:** Add a result-status filter (All / Untested / Pass / Fail / Skip) alongside the existing area and tag filters.

### 4. No Bulk Actions
Marking 10 low-priority tests as "skip" requires 10 individual clicks. No multi-select, no bulk pass/skip.

**Fix:** Add checkbox selection per test case and a bulk action bar ("Mark selected as Skip", "Mark selected as Pass").

### 5. Poor Run Comparison / Cross-Run Regression View
There is no way to compare two runs side-by-side or see which tests regressed between builds. The "Previous Runs" section only lets you switch — it does not diff.

**Fix:** Add a "Compare Runs" mode that shows a table of test cases with columns for each selected run's result, highlighting regressions (was pass, now fail).

### 6. No Assignee / Tester Attribution Per Test
`tested_by` is stored in the DB but never displayed. In a multi-tester team, you cannot tell who tested what or assign tests to specific people.

**Fix:** Display the tester's email/name next to each result. Optionally allow assigning tests to a tester before they begin.

### 7. Missing Keyboard Shortcuts
Testers working through dozens of tests need speed. There are no keyboard shortcuts for Pass (P), Fail (F), Skip (S), or Next Test (arrow down).

**Fix:** Add keyboard shortcut support when a test card is focused, with a small hint tooltip.

### 8. No "Retest" / "Reset Result" Action
Once a result is recorded, there is no explicit way to clear it and retest. You can click the same button again, but it is not obvious.

**Fix:** Add a "Clear / Retest" action that resets the result to untested.

### 9. Failure Notes UX Is Weak
- Notes textarea only appears after clicking Fail — there is no prompt or required field indicator.
- No screenshot/attachment support.
- Notes save on blur only — no explicit save button, no autosave indicator.

**Fix:** Show a save indicator on blur. Add a prompt when failing without notes. Consider a "Add Screenshot URL" field.

### 10. Run Creation Dialog Lacks Defaults
The build timestamp field is empty by default, requiring manual entry. The build label has no autocomplete from previous patterns.

**Fix:** Default the timestamp to now. Show the last 3 build labels as suggestions.

### 11. No Summary Dashboard / Charts
There are no charts — no pass/fail trend over time, no area-level heatmap, no flaky test detection. This is table stakes for Jira Test dashboards.

**Fix:** Add a small summary section with: (a) a donut chart for current run results, (b) a sparkline or bar chart showing pass rate across the last 5 runs.

### 12. Accordion Default State Is Wrong
All area accordions open by default (`defaultValue={[...groupedByArea.keys()]}`). With 8+ areas, this creates a wall of content. Should default to collapsed, or open only the first area with untested items.

**Fix:** Default all accordions to collapsed, or smart-open only areas with untested/failed items.

### 13. No Estimated Time Remaining
The header shows total estimated time but not "time remaining" based on untested cases. A tester wants to know "how much longer will this take?"

**Fix:** Show "~Xh Ym remaining" based on untested test estimates.

### 14. "Copy as Markdown" Is the Only Export
No CSV, no PDF, no direct link sharing. Markdown is useful but limiting for stakeholders who want a formatted report.

**Fix:** Add CSV export option alongside Markdown.

---

## Implementation Summary

| Change | Complexity | Files |
|--------|-----------|-------|
| Segmented progress bar | Small | `AdminQATab.tsx` |
| Collapse test details by default | Small | `AdminQATab.tsx` (TestCaseCard) |
| Result-status filter (untested/pass/fail/skip) | Small | `AdminQATab.tsx` |
| Smart accordion defaults | Small | `AdminQATab.tsx` |
| Time remaining display | Small | `AdminQATab.tsx` |
| Default timestamp in run dialog | Small | `AdminQATab.tsx` |
| Tester attribution display | Small | `AdminQATab.tsx`, `useQATestRuns.ts` |
| Clear/retest action | Small | `AdminQATab.tsx` |
| Failure notes save indicator | Small | `AdminQATab.tsx` |
| Bulk select + bulk actions | Medium | `AdminQATab.tsx` |
| Run comparison view | Medium | New component |
| Summary donut chart | Medium | `AdminQATab.tsx` + recharts |
| CSV export | Small | `AdminQATab.tsx` |
| Keyboard shortcuts | Medium | `AdminQATab.tsx` |

Total: 14 improvements. I would recommend implementing in priority order: items 1-4 and 12-13 first (high-impact, low-effort), then 5, 6, 11 (medium effort), then the rest.

