

## Plan: Make Help & AI Chat Buttons More Visible

### What changes
Style the Help button (bottom-left floating) and AI Chat button (header) with a bold yellow background in both light and dark modes.

### Details

**`src/components/HelpDrawer.tsx`** (~line 603)
- Replace the current className with: `bg-primary text-white dark:text-black` styling
- Remove `variant="outline"` and use custom classes for the yellow background
- Update the icon color to match (white in light, black in dark)

**`src/components/AppHeader.tsx`** (~lines 107-121)
- Desktop AI Chat button: replace `variant={aiChatOpen ? "default" : "outline"}` with consistent yellow background styling using `bg-primary text-white dark:text-black` classes
- Mobile AI Chat icon button: same yellow background treatment
- Both states (open/closed) get the yellow background, with a subtle ring or opacity change when active

### Color approach
- Uses the existing `--primary` CSS variable (amber/gold) as the background
- Light mode: yellow bg + white text/icons
- Dark mode: yellow bg + black text/icons
- Tailwind classes: `bg-primary text-white dark:text-black`

### Files
- `src/components/HelpDrawer.tsx` — 1 className change
- `src/components/AppHeader.tsx` — 2 button className changes

