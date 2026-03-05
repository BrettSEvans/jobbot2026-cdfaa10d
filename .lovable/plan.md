

## Style Save/Cancel Buttons in WYSIWYG Edit Mode

### Problem
The Save and Cancel buttons in edit mode lack visual distinction. Save should use the green primary color and Cancel should use a contrasting/inverse style.

### Changes

**1. `src/components/tabs/CoverLetterTab.tsx` (lines ~119-126)**
- The Save button already exists with `<Check>` icon — change variant to `default` (uses `--primary` teal/green) 
- The Cancel/Discard button — change variant to `destructive` (inverse/red system color)

**2. `src/components/tabs/HtmlAssetTab.tsx` (lines ~153-159)**
- Same changes: Save → `default` variant, Discard → `destructive` variant

Both files already have Save and Discard buttons in the editing block. Just need to update the `variant` props.

