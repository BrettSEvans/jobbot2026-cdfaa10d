

## Replace TipTap with Lexical WYSIWYG Editor

### Scope
3 files reference TipTap: `WysiwygEditor.tsx` (core), `CoverLetterTab.tsx`, and `HtmlAssetTab.tsx` (consumers). The consumers only import `WysiwygEditor` — the interface (`content`, `onChange`, `className`) stays identical, so only the editor component itself needs rewriting.

### Changes

**1. Remove TipTap packages from `package.json`**
Remove: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/extension-underline`

**2. Install Lexical packages**
Add: `lexical`, `@lexical/react`, `@lexical/rich-text`, `@lexical/list`, `@lexical/table`, `@lexical/html`, `@lexical/selection`, `@lexical/utils`

**3. Rewrite `src/components/WysiwygEditor.tsx`**
- Use `LexicalComposer` with a **theme object** that maps editor element classes to our existing Tailwind/design-system classes (e.g. `heading.h2` → font-heading styles, `table`/`tableCell` → border-border styles, `text.bold`/`text.italic`/`text.underline` → appropriate formatting)
- Register nodes: `HeadingNode`, `ListNode`, `ListItemNode`, `TableNode`, `TableCellNode`, `TableRowNode`
- Include plugins: `RichTextPlugin`, `ListPlugin`, `TablePlugin`, `HistoryPlugin`, `OnChangePlugin`
- Build a `ToolbarPlugin` component (same buttons: Bold, Italic, Underline, H2, Bullet List, Ordered List, Insert Table, Undo, Redo) using Lexical commands
- For `content` prop (HTML string in), use `$generateNodesFromDOM` inside an editor update to parse HTML into Lexical nodes
- For `onChange` callback (HTML string out), use `$generateHtmlFromNodes` from `@lexical/html`
- Sync external content changes via `useEffect` (same pattern as current TipTap version)
- Keep the same `WysiwygEditorProps` interface — no changes needed in consumer components

**4. Add editor theme CSS to `src/index.css`**
Add a dedicated `@layer components` block with classes like:
- `.lexical-editor` container styles
- `.editor-heading-h2` → uses `var(--font-heading)`, appropriate sizing
- `.editor-table`, `.editor-table-cell`, `.editor-table-header` → border-border, padding, bg-muted for headers
- `.editor-list-ul`, `.editor-list-ol` → standard list styling
- `.editor-text-bold`, `.editor-text-italic`, `.editor-text-underline` → formatting

**5. No changes to `CoverLetterTab.tsx` or `HtmlAssetTab.tsx`**
The import and props are identical — they continue to use `<WysiwygEditor content={...} onChange={...} />`.

### Lexical Theme Structure
```typescript
const theme = {
  heading: { h2: "editor-heading-h2" },
  text: { bold: "editor-text-bold", italic: "editor-text-italic", underline: "editor-text-underline" },
  list: { ul: "editor-list-ul", ol: "editor-list-ol", listitem: "editor-list-item" },
  table: "editor-table",
  tableCell: "editor-table-cell",
  tableCellHeader: "editor-table-header",
};
```

