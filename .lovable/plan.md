

## Unify Cover Letter & Resume Editing with InlineHtmlEditor

### Problem
The cover letter editor uses a primitive `contentEditable` div with only B/I/U buttons, while the resume editor uses the full `InlineHtmlEditor` component with font selection, colors, alignment, lists, and more. The hyperlink insertion feature exists in `InlineHtmlEditor` but isn't available to cover letters.

### Changes

#### 1. Enhance InlineHtmlEditor with proper hyperlink UX
**File:** `src/components/InlineHtmlEditor.tsx`
- Replace the `window.prompt` for link insertion with a small inline popover/dialog that lets users enter URL and display text
- Add an "Unlink" button to remove existing hyperlinks
- These improvements benefit both resume and cover letter editing

#### 2. Refactor CoverLetterTab to use InlineHtmlEditor
**File:** `src/components/tabs/CoverLetterTab.tsx`
- Remove the inline `contentEditable` div and B/I/U toolbar (lines 182-215)
- When editing, render `<InlineHtmlEditor>` instead, converting the plain-text cover letter to simple HTML (`<div style="white-space:pre-wrap">...text...</div>`) on edit entry
- On save, extract the text content back (or store as HTML — since cover letters are plain text, we'll wrap/unwrap cleanly)
- This gives cover letters the full toolbar: font family, font size, bold/italic/underline, text color, highlight, lists, alignment, indent, links, undo/redo

#### 3. Cover letter storage consideration
- Cover letters are currently stored as plain text. To preserve rich formatting from InlineHtmlEditor, add a `cover_letter_html` field or repurpose `cover_letter` to store HTML when edited
- Simpler approach: convert cover letter text to wrapped HTML on edit open, and on save store the HTML back to `cover_letter` field (the display already uses `white-space: pre-wrap`, so plain text still renders fine; HTML will render via iframe preview)
- Update the display mode to use an iframe preview (like resumes) when the content contains HTML tags, otherwise render as plain text

### Implementation Order
1. Enhance `InlineHtmlEditor` link insertion UX
2. Update `CoverLetterTab` to use `InlineHtmlEditor` for editing
3. Adjust save/display logic for HTML cover letters

