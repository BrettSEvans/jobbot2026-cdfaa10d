
## Move Save/Discard Buttons Above WYSIWYG Editor

### Changes

**1. `src/components/tabs/CoverLetterTab.tsx` (lines 128-137)**
Swap the order: move the button `div` above `<WysiwygEditor>`.

**2. `src/components/tabs/HtmlAssetTab.tsx` (lines 200-209)**
Same swap: move the button `div` above `<WysiwygEditor>`.

Both are simple reorders within existing `space-y-3` containers — buttons first, editor below.
