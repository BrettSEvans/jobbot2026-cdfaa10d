

## WYSIWYG Editor for Cover Letter and Resume

### Problem
The cover letter edit mode shows a raw markdown `<Textarea>`, requiring users to know markdown syntax. The resume (`HtmlAssetTab`) has no direct edit mode at all — only AI refinement. Users should be able to visually edit the formatted document.

### Approach
Use **TipTap** — a modern, lightweight rich-text editor for React with built-in support for bold, italic, lists, tables, headings, and more. It can import/export both HTML and markdown.

### Changes

**1. Install dependencies**
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/extension-underline`

**2. Create `src/components/WysiwygEditor.tsx`**
- A reusable WYSIWYG component wrapping TipTap with a minimal formatting toolbar (Bold, Italic, Underline, Bullet List, Ordered List, Heading, Table).
- Props: `content: string` (HTML), `onChange: (html: string) => void`, `className?: string`
- Clean, minimal toolbar styled with existing shadcn button components.

**3. Update `src/components/tabs/CoverLetterTab.tsx`**
- In edit mode (line 124-135): replace the `<Textarea>` with the `WysiwygEditor`.
- On entering edit mode, convert the markdown to HTML via `marked.parse()` for the editor.
- On save, store the HTML output directly in `cover_letter` (the preview already uses `buildCoverLetterHtml` which accepts markdown — we will update it to detect if input is already HTML and pass through).
- Update `buildCoverLetterHtml` to handle both markdown and pre-formatted HTML input.

**4. Update `src/components/tabs/HtmlAssetTab.tsx`**
- Add an "Edit" button alongside "Refine with AI" in the toolbar.
- When editing, replace the read-only iframe with the `WysiwygEditor` loaded with the current HTML.
- Add Save/Discard buttons (same pattern as cover letter).
- Save writes the edited HTML back via `saveField`.

**5. Update `src/lib/coverLetterPdf.ts`**
- Modify `buildCoverLetterHtml` so that if the input already contains HTML tags (e.g. `<p>`, `<table>`), it skips the `marked.parse()` step and uses the content directly. This ensures cover letters saved as HTML from the WYSIWYG editor render correctly.

