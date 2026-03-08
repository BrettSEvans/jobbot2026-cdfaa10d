

## Plan: Refactor ATS Card & Collapse Resume History

Two changes in scope:

### 1. Rewrite ATS Score Card (`src/components/AtsScoreCard.tsx`)

The current implementation uses `Collapsible` which has been unreliable. Replace with a simpler approach:

- Remove `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` dependency
- Use plain React state (`expanded`) with conditional rendering and CSS transitions
- Move the "Scan" CTA to be more prominent when no score exists yet (currently `return null` when `!score && !loading` — instead show a compact "Scan ATS Match" button)
- Keep the circular gauge, keyword badges, and suggestion list structure intact
- Add a regression test in `src/test/maui/atsScore.test.ts` for the visibility logic

### 2. Make Resume History collapsible, collapsed by default (`src/components/AssetRevisions.tsx`)

- Wrap the revisions list in a `Collapsible` with `defaultOpen={false}`
- Make the `CardHeader` the trigger — clicking the header row toggles open/closed
- Add a chevron icon that rotates on expand
- The card still returns `null` when empty (no revisions)

### Files to modify

| File | Change |
|---|---|
| `src/components/AtsScoreCard.tsx` | Full rewrite: drop Collapsible, use plain state + conditional render; show scan CTA when no score |
| `src/components/AssetRevisions.tsx` | Wrap content in Collapsible, default collapsed, clickable header with chevron |
| `src/test/maui/atsScore.test.ts` | Add test for "card visible when no score but resume exists" |

