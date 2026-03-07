

## Mobile UX Review & Improvement Plan

### Findings from Senior UX Review

After a thorough audit of the codebase across all major screens, here are the issues and recommended fixes organized by severity.

---

### Critical (P0) — Broken or Unusable on Mobile

**1. AppHeader navigation is not mobile-friendly**
The header nav (`AppHeader.tsx` line 79-93) renders 4 text buttons ("Applications", "Templates", "Membership", "Profile") in a horizontal `flex` row with no mobile breakpoint. On screens <375px these overflow or get clipped. There is no hamburger menu, bottom nav, or collapsible drawer.

*Fix:* Add a mobile hamburger menu (Sheet drawer) that replaces the horizontal nav below `md` breakpoint. Show only the logo + hamburger + theme toggle on mobile.

**2. Applications table is not mobile-optimized**
The main table (`Applications.tsx` lines 516-648) uses a `<Table>` layout. While some columns are hidden with `hidden md:table-cell`, the remaining 5 visible columns (Company, Role, Status, Created, Actions) still overflow on small screens. The action buttons row (Copy, Preview, Delete) is cramped.

*Fix:* Replace the table with a card-based list view below `md` breakpoint. Each card shows company/role/status with actions accessible via a context menu or swipe actions.

**3. Kanban board has no mobile touch support**
The Kanban board (`KanbanBoard.tsx` lines 139-172) uses HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDrop`) which does not work on mobile touch devices. Users cannot move cards between stages on phones.

*Fix:* Add a "Move to" dropdown button on each Kanban card that appears on mobile (below `md`). This provides touch-friendly stage changes without requiring drag-and-drop.

---

### High (P1) — Functional but Poor Experience

**4. ApplicationDetail header overflows on mobile**
The header row (`ApplicationDetail.tsx` line 232-266) has: Back button + company/role title + pipeline dropdown + "View all stages" link + Info button + status badge. Even with `flex-wrap`, this creates 2-3 rows of small controls that feel cluttered.

*Fix:* Stack the layout vertically on mobile: title on its own row, controls (pipeline dropdown, info, status) on a second row. Hide "View all stages →" link on mobile (it's discoverable from the main Applications page).

**5. NewApplication form cards stack without breathing room**
The new application form (`NewApplication.tsx` lines 158-315) stacks 4-5 cards vertically with standard spacing. On mobile, this creates a very long scroll with no visual hierarchy or progress indication.

*Fix:* Add a compact step indicator or collapse optional cards (Company URL, Resume Style, Source Resume) into an "Advanced Options" collapsible section on mobile.

**6. Bookmarked nudge banner wraps poorly**
The stale bookmarked app banner (`Applications.tsx` lines 391-408) uses `flex items-center justify-between` — on mobile the text and buttons stack but the buttons don't get full width, creating an awkward layout.

*Fix:* Stack the banner vertically on mobile with `flex-col sm:flex-row` and make buttons full-width below `sm`.

---

### Medium (P2) — Polish & Enhancement

**7. Pipeline analytics not touch-friendly**
`PipelineAnalytics` renders above the Kanban board but its charts/metrics may not be optimized for small viewports.

**8. Bulk action bar in Kanban overflows**
The bulk action bar (`KanbanBoard.tsx` lines 273-300) has: icon + text + arrow + dropdown + Move button + close button — all in one row. On mobile this overflows.

*Fix:* Wrap to two rows on mobile with `flex-wrap`.

**9. AiChat floating button may overlap with content**
The AI chat component is a floating overlay that could cover important action buttons on mobile.

**10. Touch targets too small**
Several icon-only buttons use `h-8 w-8` (32px) which is below the recommended 44px minimum for mobile touch targets (WCAG 2.1 AA). Examples: theme toggle, sign out, change asset button.

*Fix:* Increase touch targets to `h-10 w-10` on mobile using responsive classes.

---

### Implementation Plan

| File | Change |
|------|--------|
| `src/components/AppHeader.tsx` | Add mobile hamburger menu with Sheet drawer, hide inline nav below `md` |
| `src/pages/Applications.tsx` | Card-based list view below `md`, stack nudge banners vertically on mobile |
| `src/components/KanbanBoard.tsx` | Add "Move to" dropdown on cards for mobile, wrap bulk action bar |
| `src/pages/ApplicationDetail.tsx` | Stack header vertically on mobile, hide "View all stages" link below `sm` |
| `src/pages/NewApplication.tsx` | Collapse optional cards into "Advanced Options" on mobile |
| `src/components/ui/dialog.tsx` | Ensure safe-area-inset padding for notched devices |

This is a substantial set of changes. I recommend tackling them in two batches:
- **Batch 1 (Critical):** AppHeader hamburger menu, Applications card view, Kanban touch support
- **Batch 2 (High/Medium):** Detail page stacking, form simplification, touch target sizing

