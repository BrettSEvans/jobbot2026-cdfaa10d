

## One-Click "Copy Fix Prompt" for Failed QA Tests

### Overview

Add a new test result status **"Prompt Fix"** to the QA workflow. When a test fails and has failure notes, an admin can click a button to copy a structured fix prompt (including success criteria) to the clipboard, and the test status automatically changes to "Prompt Fix" — indicating a fix has been dispatched to Lovable.

### Result Status Flow

```text
untested → pass ✓
         → fail → (add failure notes) → "Copy Fix Prompt" → status becomes "prompt_fix"
         → skip
```

### Changes

**1. `src/components/admin/AdminQATab.tsx`**

- Add `"prompt_fix"` to the `TestResult` type and `ResultFilter` type
- Add a `generateFixPrompt(tc, savedResult, buildLabel)` helper that builds a markdown prompt including:
  - Test title, area, route, build label
  - Steps to reproduce
  - Expected results (these become the **success criteria**)
  - QA failure notes (what went wrong)
  - Explicit "Success Criteria" section derived from the test's `expectedResults`
- Add a clipboard/wand button in `TestCaseCard`, visible when `result === "fail"` and failure notes exist
- On click: copy prompt to clipboard, then call `onResult("prompt_fix")` to update the status
- Add purple/indigo styling for "prompt_fix" badge and progress bar segment
- Add "prompt_fix" to the filter dropdown, progress bar, donut chart, and markdown/CSV/XLSX exports

**2. `src/hooks/useQATestRuns.ts`**

- No schema changes needed — `result` column is already a text field, so `"prompt_fix"` works as-is

**3. `.lovable/plan.md`**

- Update plan to document the Prompt Fix workflow

### Prompt Template

```markdown
Fix the following QA test failure:

**Test:** {title}
**Area:** {area} | **Route:** {route}
**Build:** {buildLabel}

**Steps to Reproduce:**
1. {step1}
2. {step2}

**What Went Wrong:**
{failureNotes}

**Success Criteria (all must pass):**
- {expectedResult1}
- {expectedResult2}

Please investigate and fix this issue. After fixing, verify all success criteria are met.
```

### UI Details

- Button: Wand icon (`Wand2` from lucide) with tooltip "Copy Fix Prompt"
- Appears next to the wrench (Fix Regression) button, only when test is failed + has notes
- On click: copies prompt, changes status to `prompt_fix`, shows toast "Fix prompt copied — paste into Lovable chat"
- `prompt_fix` badge: indigo/purple color, label "Prompt Fix"
- Progress bar: new indigo segment between fail and skip

