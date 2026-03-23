

## Reduce Clarity Resume Spacing + Add Line/Paragraph Spacing Controls to Editor

### Changes

#### 1. Tighten default spacing in Clarity resume generation
**File:** `supabase/functions/generate-resume-clarity/index.ts`
- Update the LAYOUT & FORMATTING prompt section to instruct tight inline styles:
  - `line-height: 1.2` on body-level elements
  - `margin: 0 0 4px 0` on all `<p>` and `<li>` elements
  - `margin: 8px 0 4px 0` on `<h2>` section headings
  - `padding-left: 18px; margin: 0` on `<ul>` elements
- Change the page target from "one page equivalent (~600-800 words)" to "two pages max (~800-1200 words)"
- Add explicit instruction: "Apply tight spacing inline styles to every element"

#### 2. Add Line Spacing & Paragraph Spacing controls to InlineHtmlEditor toolbar
**File:** `src/components/InlineHtmlEditor.tsx`
- Add a **Line Spacing** `<select>` dropdown (1.0, 1.15, 1.2, 1.5, 2.0) after the Indent/Outdent group
  - On change: inject/update a `<style>` tag in the iframe's `<head>` setting `body { line-height: <value> !important; }`
- Add a **Paragraph Spacing** `<select>` dropdown (None/0px, Tight/4px, Normal/8px, Relaxed/12px, Wide/16px)
  - On change: inject/update a `<style>` tag setting `p, li, div { margin-bottom: <value> !important; }`
- Both use the same pattern: find-or-create a `<style id="editor-spacing">` element in the iframe head and update its `textContent`

#### 3. Preserve cover letter editing (no regressions)
- The `CoverLetterTab` already uses `InlineHtmlEditor` — these new controls will automatically be available there too
- No changes needed to `CoverLetterTab.tsx`

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/generate-resume-clarity/index.ts` | Tighten spacing in prompt, target two pages |
| `src/components/InlineHtmlEditor.tsx` | Add line-spacing and paragraph-spacing dropdowns |

