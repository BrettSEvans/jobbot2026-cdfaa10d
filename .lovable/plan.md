

## Add Editable Header/Footer Fields to WYSIWYG Editor

Add separate input fields above and below the Lexical editor for header text (name, contact info) and footer text (disclaimer, page number note). These fields are plain text inputs outside the rich-text area, passed via new props and rendered in PDF output.

### Changes

**1. `src/components/WysiwygEditor.tsx`**
- Extend `WysiwygEditorProps` with optional `headerText`, `onHeaderChange`, `footerText`, `onFooterChange` props.
- When provided, render a styled header input area above the toolbar (text input for name + a smaller input for contact/subtitle line) and a footer textarea below the editor content area.
- Style these zones with subtle background and borders to distinguish them from the main editor body.

**2. `src/components/tabs/CoverLetterTab.tsx`**
- Add `headerText` and `footerText` state, initialized from the cover letter's existing header data (applicant name, date) when entering edit mode.
- Pass these as props to `WysiwygEditor`.
- On save, include header/footer values in the persisted data (store as JSON fields or concatenate into the HTML output).

**3. `src/lib/coverLetterPdf.ts`**
- Update `buildCoverLetterHtml` to accept optional `headerText` and `footerText` overrides that replace the default header/signature blocks when provided.

**4. `src/index.css`**
- Add `.editor-header-zone` and `.editor-footer-zone` styling classes.

### Props Interface (WysiwygEditor)
```typescript
interface WysiwygEditorProps {
  content: string;
  onChange: (html: string) => void;
  className?: string;
  headerText?: string;
  onHeaderChange?: (text: string) => void;
  footerText?: string;
  onFooterChange?: (text: string) => void;
}
```

The header/footer fields are simple `<input>` / `<textarea>` elements rendered outside the Lexical composer, keeping them decoupled from the rich text content.

