

## Plan: Mobile-Friendly Asset Swap Dialog & Orientation-Resilient Layout

### Problems
1. **ChangeAssetDialog has no scroll** — when suggestions overflow the viewport on mobile, content is clipped with no way to scroll
2. **Screen rotation causes full page reload** — instead of gracefully reflowing, rotation triggers a re-render that closes open dialogs/panels

---

### 1. Make ChangeAssetDialog scrollable on mobile

**File: `src/components/ChangeAssetDialog.tsx`**

- Add `max-h-[80vh] overflow-y-auto` to the DialogContent so it scrolls on small screens
- Wrap the suggestions list in a `ScrollArea` with `max-h-[50vh]` so long lists scroll independently
- Add mobile padding: change `max-w-lg` to `max-w-lg max-h-[85vh]` with `overflow-hidden` on outer, scroll on inner

### 2. Make DialogContent mobile-friendly globally

**File: `src/components/ui/dialog.tsx`**

- Add `max-h-[85vh] overflow-y-auto` to the base DialogContent class so all dialogs are scrollable on mobile (this is a common Radix Dialog gap)

### 3. Prevent full reload on orientation change

**File: `src/pages/ApplicationDetail.tsx`**

- The issue is that orientation change on mobile triggers a viewport resize → the preview iframe and parent re-render, which resets state
- Add a `useEffect` with a `resize`/`orientationchange` listener that:
  - Does NOT reset `activeView`, `chatOpen`, or dialog state on resize
  - Debounces the resize to avoid intermediate re-renders
- Ensure the header bar wraps properly on narrow viewports by adding `flex-wrap` to the header row (line 232)

### 4. Make ApplicationDetail header responsive

**File: `src/pages/ApplicationDetail.tsx`**

- Line 232: Add `flex-wrap` to header so pipeline dropdown + badges stack on mobile
- Line 303: Make the tab bar horizontally scrollable with `overflow-x-auto` instead of wrapping/clipping
- Line 338: Industry assets grid — already `grid-cols-1 sm:grid-cols-3`, but the swap button row needs `min-w-0` on the text to prevent overflow

---

### Files changed

| File | Change |
|------|--------|
| `src/components/ChangeAssetDialog.tsx` | Add ScrollArea for suggestions, max-height + overflow for mobile |
| `src/components/ui/dialog.tsx` | Add `max-h-[85vh] overflow-y-auto` to base DialogContent |
| `src/pages/ApplicationDetail.tsx` | flex-wrap header, scrollable tabs, debounced resize guard |

