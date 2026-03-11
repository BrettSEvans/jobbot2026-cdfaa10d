

## Fix: DOCX Export Outputs Raw Code Instead of Formatted Content

### Root Cause

The `export-docx` edge function naively strips **all** HTML tags with a single regex (`/<[^>]*>/g`), which means:

1. `<style>...</style>` and `<script>...</script>` block **contents** (CSS rules, JS code) are preserved as visible text in the DOCX
2. All formatting (bold, italic, headings, lists, tables) is lost -- everything becomes flat plain text paragraphs

Since resumes are full HTML documents with embedded `<style>` blocks, the downloaded DOCX contains visible CSS code mixed with resume text.

### Fix

Rewrite the `export-docx` edge function to:

1. **Strip `<style>`, `<script>`, and `<head>` blocks entirely** (content and tags) before any other processing
2. **Extract only `<body>` content** if a full HTML document is provided
3. **Map semantic HTML to OOXML formatting**:
   - `<h1>`-`<h6>` → OOXML heading styles (`w:pStyle val="Heading1"` etc.)
   - `<strong>`, `<b>` → bold runs (`<w:b/>`)
   - `<em>`, `<i>` → italic runs (`<w:i/>`)
   - `<ul>/<ol>/<li>` → bulleted/numbered list paragraphs
   - `<br>` → line breaks, `<p>` → paragraph breaks
   - `<table>/<tr>/<td>` → OOXML table markup
4. **Add a `styles.xml`** to the DOCX zip so heading/list styles render correctly in Word

### Files Changed

- `supabase/functions/export-docx/index.ts` -- rewrite HTML-to-OOXML conversion logic with proper tag parsing and style support

### Technical Approach

Replace the regex strip-and-dump approach with a recursive HTML-to-OOXML converter:

```text
Input HTML document
  ├── Remove <head>, <style>, <script> blocks entirely
  ├── Extract <body> inner content
  └── Walk HTML elements:
       ├── <h1-h6>  → w:p with Heading style
       ├── <p/div>  → w:p
       ├── <b/strong> → w:rPr > w:b
       ├── <i/em>   → w:rPr > w:i
       ├── <u>      → w:rPr > w:u
       ├── <li>     → w:p with list style
       ├── <table>  → w:tbl > w:tr > w:tc
       └── text     → w:r > w:t
```

The DOCX zip will also include `word/styles.xml` defining Heading1-6 and ListBullet styles so Word renders them correctly.

