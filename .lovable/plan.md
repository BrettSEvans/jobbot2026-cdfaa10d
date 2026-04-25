## Problem

On the Materials tab of the Plaid — Integrations Operations Program Manager application, when many materials exist (Dashboard, Cover Letter, Resume, Roadmap, RAID Log, Architecture Diagram, Standardized Integration QA Framework, etc.), the tab labels wrap to a second row. The last tab ("Standardized Integration QA Framework") visually escapes the muted background "card" of the tab strip.

## Root cause

`src/components/ui/tabs.tsx` defines `TabsList` with a hard-coded `h-10` (40px height). In `DynamicMaterialsSection.tsx` the materials tab strip uses `flex-wrap` so labels can wrap, but the container's height is locked at 40px. When tabs wrap onto a second line, that second row renders **below** the 40px muted background — making the wrapped tabs appear to "escape" the card.

```tsx
// src/components/ui/tabs.tsx
"inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 ..."

// src/components/DynamicMaterialsSection.tsx (line 621)
<TabsList className="w-full justify-start flex-wrap">
```

The base `h-10` was designed for single-row tab strips. The materials strip is the only place in the app that combines `flex-wrap` with a dynamic, unbounded number of tabs.

## Fix

Override the fixed height locally on the materials `TabsList` so the muted background grows to contain however many wrapped rows exist. I'll also add a small vertical gap so the rows have breathing room.

**File: `src/components/DynamicMaterialsSection.tsx` (line 621)**

Change:
```tsx
<TabsList className="w-full justify-start flex-wrap">
```
to:
```tsx
<TabsList className="w-full justify-start flex-wrap h-auto gap-1">
```

- `h-auto` releases the 40px lock so the muted container expands to fit wrapped rows.
- `gap-1` adds a 4px vertical/horizontal gap between wrapped triggers so rows don't visually collide.
- No change to the shared `tabs.tsx` primitive — other tab strips in the app (Resume / Cover Letter / JD / Materials / Details on the parent page, dashboard sub-tabs, etc.) keep their existing single-row 40px design.

## Verification

After the change, on the Plaid application:
- All material tabs (including "Standardized Integration QA Framework") sit fully inside the muted rounded-md background.
- When the strip wraps to two rows (~965px viewport, current user width), both rows are contained.
- Single-row strips elsewhere in the app remain visually identical.

## Out of scope

- No changes to tab content, generation logic, or material count.
- Not modifying the shared `TabsList` primitive — keeps risk surface to one line in one file.
