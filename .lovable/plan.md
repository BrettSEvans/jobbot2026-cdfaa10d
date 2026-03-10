

## Export Test Suites as Spreadsheet

### Approach
Enhance the existing CSV export to produce a richer `.csv` file that opens cleanly in Excel/Google Sheets, plus add an XLSX export using `JSZip` (already installed) for a formatted multi-sheet workbook.

### What changes

**`src/components/admin/AdminQATab.tsx`**

1. **Add `exportAsXlsx()` function** — builds a proper `.xlsx` file (ZIP of XML, same pattern as the existing `export-docx` edge function but client-side):
   - **Sheet 1 "Summary"**: Build label, timestamp, status, pass/fail/skip/untested counts, completion %, total estimated time
   - **Sheet 2 "Test Results"**: Area, Test Case ID, Title, Result, Failure Notes, Tags, Route, Est. Minutes, Steps, Expected Results — with colored fill on the Result column (green=pass, red=fail, yellow=skip, gray=untested)

2. **Add a "Spreadsheet" button** next to the existing CSV and Markdown buttons using `<FileSpreadsheet />` icon from lucide

3. Uses `JSZip` imported client-side — no new dependencies, no edge function needed

### Files to edit
- `src/components/admin/AdminQATab.tsx` — add ~80 lines for `exportAsXlsx` function + 1 button

