

# Fix Resume Left Margin + Enhance WYSIWYG Editor

## 1. Fix resume preview left margin (`src/pages/ApplicationDetail.tsx`)

Add horizontal padding (`px-4`) to the `ResumePagePreview` wrapper `Card` so the scaled iframe has visible margin on left and right sides.

## 2. Enhance InlineHtmlEditor with new toolbar features (`src/components/InlineHtmlEditor.tsx`)

All features use the existing iframe `document.execCommand` API — no new libraries needed.

**New toolbar groups to add:**

- **Font family picker** — `<select>` dropdown with common fonts (Arial, Times New Roman, Georgia, Courier New, Verdana, Tahoma). Uses `execCommand("fontName", false, fontName)`.

- **Font size picker** — `<select>` dropdown with sizes 1–7 (browser scale). Uses `execCommand("fontSize", false, size)`.

- **Text color** — Color `<input type="color">` that calls `execCommand("foreColor", false, hex)`.

- **Highlight color** — Color `<input type="color">` that calls `execCommand("hiliteColor", false, hex)`.

- **Text alignment** — 4 buttons: Left, Center, Right, Justify. Uses `justifyLeft`, `justifyCenter`, `justifyRight`, `justifyFull`.

- **Insert link** — Button that prompts for URL via `window.prompt`, calls `execCommand("createLink", false, url)`.

- **Indent / Outdent** — Two buttons using `execCommand("indent")` and `execCommand("outdent")`.

**Toolbar layout:** Group buttons logically with separators between groups. Font/size selectors use compact `<select>` elements styled to match the toolbar. Color inputs use small color swatches. The toolbar wraps naturally on narrow screens.

### Files to modify
- `src/pages/ApplicationDetail.tsx` — add padding to `ResumePagePreview`
- `src/components/InlineHtmlEditor.tsx` — add new toolbar controls

