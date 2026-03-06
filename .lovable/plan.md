

## Fix: Cover Letter Read-Only Scroll

**Problem**: The cover letter iframe uses `aspectRatio: "8.5 / 11"` with `maxHeight: "70vh"`, which clips the bottom of the document. The iframe has no scrolling enabled.

**Fix** in `src/components/tabs/CoverLetterTab.tsx` (lines ~155-161):
- Remove the `aspectRatio` constraint and set a fixed height (e.g. `height: "70vh"`) so the iframe fills a reasonable viewport area
- The iframe content will naturally scroll since iframes scroll by default — the issue is that `aspectRatio` is forcing a tall aspect ratio that gets clipped by `maxHeight`, creating a mismatch where content overflows but the iframe viewport is cut short
- Change to: `style={{ height: "70vh" }}` and add `className="w-full border rounded bg-white"` (keep existing classes)

This is a one-line style change.

