

## Cover Letter: Rendered Preview Instead of Raw Markdown

**Problem**: The cover letter tab currently renders markdown via `ReactMarkdown`, which shows structural markup (headings, bold, etc.) but looks like a document source file rather than a finished letter. The user expects to see what the PDF will look like.

**Solution**: Replace the `ReactMarkdown` rendering with an iframe-based preview that reuses the same HTML template from `coverLetterPdf.ts`. This gives the user a true WYSIWYG view of the final PDF output.

### Changes

**1. Extract HTML builder from `src/lib/coverLetterPdf.ts`**
- Factor out the HTML generation into a new exported function `buildCoverLetterHtml(coverLetter, companyName, jobTitle, applicantName?)` that returns the formatted HTML string.
- `downloadCoverLetterPdf` calls this new function internally (no behavior change).

**2. Update `src/components/tabs/CoverLetterTab.tsx`**
- Import `buildCoverLetterHtml` instead of `ReactMarkdown`.
- In the read-only display branch (line 136-139), replace the `<ReactMarkdown>` block with an `<iframe>` whose `srcDoc` is set to the output of `buildCoverLetterHtml(...)`.
- Style the iframe to fill the card width with a fixed aspect ratio (~letter proportions, roughly `aspect-[8.5/11]`) and a subtle border/shadow to look like a page.
- Keep the editing mode (`<Textarea>`) unchanged — raw text editing is fine there.

**3. Styling details**
- Iframe: `w-full aspect-[8.5/11] max-h-[70vh] border rounded bg-white` to simulate a paper page.
- Remove the `prose` wrapper since content is now in the iframe.
- The iframe body already has proper serif fonts, margins, and formatting from the PDF template.

This ensures the preview exactly matches the downloaded PDF, giving the user confidence in what they will receive.

