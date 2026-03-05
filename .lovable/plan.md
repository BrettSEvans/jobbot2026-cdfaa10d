## Show Date and Divider in WYSIWYG Editor Header

**The Problem**: The cover letter preview (iframe) shows the date and a horizontal line in the header because `buildCoverLetterHtml` generates those. But the WYSIWYG editor's header zone is just two plain `<input>` fields — it has no date display or visual divider.

**The Fix**: Enhance the `.editor-header-zone` in `WysiwygEditor.tsx` and its CSS to include:

1. **A date line** — rendered as a read-only formatted date string below the subtitle input (auto-generated from `new Date()`, matching the PDF format). An optional `dateText` prop lets the parent override it.
2. **A bottom border / horizontal rule** on the header zone — matching the `1.5pt solid #2a2a2a` border in the PDF template, so the editor visually mirrors the final output.

### Changes

`**src/components/WysiwygEditor.tsx**`

- Add a formatted date display (non-editable, or optionally editable via a new `dateText`/`onDateChange` prop pair) below the subtitle input inside `.editor-header-zone`.
- The date defaults to today's date in "Month Day, Year" format, matching `buildCoverLetterHtml`.
- Add finished code t the resume editor as well.  refactor if needed so that all wyswig editing shares the same codebase

`**src/index.css**`

- Update `.editor-header-zone` to include a bottom border (`border-bottom: 1.5pt solid #2a2a2a; padding-bottom: 10px; margin-bottom: 0`) that mirrors the PDF header divider.
- Style the date line with smaller, muted text matching the PDF's `.header .date` style.

`**src/components/tabs/CoverLetterTab.tsx**`

- No structural changes needed — the date is auto-generated within the editor component. The existing `headerText` and `footerText` props continue to work as-is.

This is purely a visual/UI enhancement — no new Lexical plugins are needed since the date and line are outside the rich-text editing area (they're part of the header zone wrapper).