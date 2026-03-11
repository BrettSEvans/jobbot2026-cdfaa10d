

## Show Fix Prompt Inline + Add Tooltips

### Changes (single file: `src/components/admin/AdminQATab.tsx`)

**1. Display generated prompt inline above failure notes**

When the wand button is visible (test is failed, has failure notes, not fixed/completed), render the generated prompt text in a styled `<pre>` block above the failure notes textarea. This lets QA/admins preview exactly what will be copied.

- Insert a new block inside the `{(isFailed || isPromptFix) && ...}` section, before the textarea
- Condition: same as wand visibility — `isFailed && !isFixed && !isCompleted && savedResult?.failure_notes`
- Render in a `<pre>` with `bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded p-2 text-xs whitespace-pre-wrap font-mono`
- Label it with a small "Fix Prompt Preview" header

**2. Convert all `title=` attributes on icon buttons to proper Radix `<Tooltip>` components**

Buttons currently using `title=` for hover text (Details toggle, Delete, Fix Regression, Pass, Fail, Skip, Clear/Retest) will be wrapped in `<Tooltip>/<TooltipTrigger>/<TooltipContent>` for consistent, styled tooltips. The wand button already uses this pattern — replicate for the others.

Affected buttons (~7):
- Eye/EyeOff (Show/Hide details)
- Trash2 (Delete custom test)
- Wrench (Fix Regression)
- CheckCircle2 (Pass)
- XCircle (Fail)
- MinusCircle (Skip)
- RotateCcw (Clear/Retest)

