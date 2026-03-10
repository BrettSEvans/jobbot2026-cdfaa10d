# Design Document: Context-Aware Help System

> **Version**: 1.0  
> **Date**: 2026-03-10  
> **Authors**: Engineering, UX Design, Product Management  
> **Status**: Production — battle-tested across 30+ help entries

---

## 1. Executive Summary

The Help System is a self-documenting, context-aware documentation layer that surfaces relevant help content based on the user's current route. It consists of a floating help button, a slide-out drawer with contextual and searchable content, and a pluggable registry that allows any feature to register its own documentation at the point of implementation.

**Key differentiator**: Help content is co-located with feature code, ensuring documentation stays in sync as the product evolves.

---

## 2. Product Requirements (Product Manager Perspective)

### 2.1 Problem Statement
Users in complex SaaS applications frequently struggle to discover features, understand workflows, and self-serve answers. Traditional documentation (external wikis, knowledge bases) becomes stale and disconnected from the product.

### 2.2 Goals
| Goal | Metric | Target |
|------|--------|--------|
| Self-service resolution | % of users who find answers without support tickets | > 80% |
| Feature discoverability | Help drawer engagement rate | > 15% of active users |
| Documentation freshness | % of features with registered help entries | 100% |
| Contextual relevance | Users see page-relevant content first | Always |

### 2.3 User Stories
1. **As a user**, I want to see help content relevant to my current page so I don't have to search through irrelevant topics.
2. **As a user**, I want to search all help topics when I have a specific question.
3. **As a user**, I want to see step-by-step instructions for complex workflows.
4. **As a user**, I want to discover related features through cross-links.
5. **As a developer**, I want to register help content alongside my feature code so documentation doesn't drift.

### 2.4 Non-Goals
- No chatbot or AI-powered Q&A (help is static, curated content).
- No analytics tracking of individual help entry views (may add later).
- No user-submitted feedback on help entries.
- No versioning of help content (it evolves with the codebase).

---

## 3. Architecture (Senior Engineer Perspective)

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────┐
│                    App Shell                         │
│  ┌──────────┐                    ┌───────────────┐  │
│  │HelpButton│───opens───────────▶│  HelpDrawer   │  │
│  │(FAB)     │                    │  (Sheet)      │  │
│  └──────────┘                    │               │  │
│                                  │  ┌──────────┐ │  │
│                                  │  │Contextual│ │  │
│                                  │  │Section   │ │  │
│                                  │  └──────────┘ │  │
│                                  │  ┌──────────┐ │  │
│                                  │  │Search    │ │  │
│                                  │  │Results   │ │  │
│                                  │  └──────────┘ │  │
│                                  └───────────────┘  │
│                                         │           │
│                                         ▼           │
│  ┌─────────────────────────────────────────────┐    │
│  │              helpRegistry.ts                 │    │
│  │  Map<slug, HelpMeta>                        │    │
│  │  • registerHelp(meta)                       │    │
│  │  • getAllHelp() → sorted alphabetically      │    │
│  │  • getHelpBySlug(slug) → single entry       │    │
│  │  • getHelpForRoute(pathname) → contextual   │    │
│  │  • searchHelp(query) → full-text filter     │    │
│  └─────────────────────────────────────────────┘    │
│                    ▲                                 │
│                    │ registerHelp() calls            │
│  ┌─────────────────────────────────────────────┐    │
│  │            helpEntries.ts                    │    │
│  │  ~35 entries covering all pages & features   │    │
│  │  Imported once at app startup (side-effect)  │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 3.2 Data Model

```typescript
interface HelpMeta {
  slug: string;           // Unique identifier, kebab-case (e.g. "master-cover-letter")
  title: string;          // Human-readable title displayed in drawer
  summary: string;        // 1-3 sentence description of the feature
  steps?: string[];       // Ordered "How to use" instructions
  tips?: string[];        // Bullet-point tips and tricks
  relatedSlugs?: string[];// Cross-links to other help entries
  route?: string;         // Route pattern for contextual matching (e.g. "/applications/:id")
  keywords?: string[];    // Additional search terms not in title/summary
}
```

**Design decisions**:
- `slug` is the primary key — must be globally unique, kebab-case.
- `route` supports parameterized patterns (`/applications/:id`) converted to regex at match time.
- `keywords` augments search without polluting user-visible content.
- `relatedSlugs` enables navigation between entries without hardcoding component dependencies.

### 3.3 Registry (`helpRegistry.ts`)

The registry is a singleton `Map<string, HelpMeta>` with five pure functions:

| Function | Purpose | Complexity |
|----------|---------|------------|
| `registerHelp(meta)` | Adds/overwrites an entry | O(1) |
| `getAllHelp()` | Returns all entries sorted by title | O(n log n) |
| `getHelpBySlug(slug)` | Direct lookup | O(1) |
| `getHelpForRoute(pathname)` | Filters by route pattern match | O(n) per call |
| `searchHelp(query)` | Full-text substring search across all fields | O(n·m) |

**Route matching algorithm**:
```
1. If entry has no route → skip
2. If entry.route === pathname → match (exact)
3. Convert route pattern: replace ":param" segments with regex "[^/]+"
4. Test regex against pathname
```

**Search algorithm**:
```
1. Lowercase + trim query
2. For each entry, concatenate: title + summary + steps + tips + keywords
3. Lowercase the haystack
4. Return entries where haystack.includes(query)
```

### 3.4 Entry Registration (`helpEntries.ts`)

This is a side-effect module imported once at app startup. It contains ~35 `registerHelp()` calls organized by:
1. **Pages** — auth, applications, profile, admin, etc.
2. **Features** — ATS score, Vibe Edit, batch mode, etc.
3. **UI Components** — WYSIWYG editor, template selector, etc.

**Convention**: New features should add their `registerHelp()` call in `helpEntries.ts` (or co-located in the component file for highly isolated features).

Each entry follows a template:
```typescript
registerHelp({
  slug: 'feature-name',           // kebab-case, unique
  title: 'Human Readable Title',  // Short, noun-based
  summary: 'What this is and why it matters. 1-3 sentences.',
  steps: [                        // 2-6 sequential instructions
    'Do the first thing.',
    'Then do the second thing.',
    'Finally, observe the result.',
  ],
  tips: [                         // 0-4 non-sequential advice
    'Pro tip about edge cases or shortcuts.',
  ],
  route: '/page-path',            // Optional: enables contextual surfacing
  keywords: ['search', 'terms'],  // Optional: improves discoverability
  relatedSlugs: ['other-entry'],  // Optional: cross-linking
});
```

### 3.5 UI Components

#### HelpButton (`HelpButton.tsx`)
- **Type**: Floating Action Button (FAB)
- **Position**: Fixed, bottom-right corner (`bottom-6 right-6`)
- **Z-index**: 50
- **Behavior**: Toggles `HelpDrawer` open state
- **Icon**: `HelpCircle` from lucide-react
- **Size**: 48×48px circle with shadow

```typescript
// Complete component — intentionally minimal
export default function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform">
        <HelpCircle className="h-5 w-5" />
      </Button>
      <HelpDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
```

#### HelpDrawer (`HelpDrawer.tsx`)
- **Type**: Sheet (slide-out panel) from shadcn/ui
- **Side**: Right
- **Width**: Full on mobile, max 448px on desktop (`sm:max-w-md`)
- **Layout**: Two zones — sticky header + scrollable body

**Sticky Header Zone** (flex-shrink-0):
1. Title: "Help & Documentation"
2. "Take the Tour" button — closes drawer, starts tutorial after 300ms delay
3. Search input with magnifying glass icon
4. Section label (dynamic: "Relevant to this page" or "All Help Topics")

**Scrollable Body** (flex-1 overflow-y-auto):
1. **Contextual section** (when on a page with matching entries):
   - Background: `bg-accent/50` with rounded container
   - Auto-expands first entry on drawer open
   - Shows only entries matching current route
2. **All Help Topics** section:
   - Excludes contextual entries (avoids duplication)
   - Full alphabetical list
3. **Search mode**: Replaces both sections with filtered results

**Each HelpEntry** renders as an Accordion item:
- Trigger: Entry title (font-medium, hover:no-underline)
- Content:
  - Summary paragraph
  - "How to use" ordered list (if steps exist)
  - "Tips" unordered list (if tips exist)
  - "Related:" badges (if relatedSlugs exist, clickable to navigate/expand)

**Navigation between entries**: Clicking a related badge:
1. Adds the target slug to expanded accordion state
2. Scrolls to the target entry after 150ms delay using `scrollIntoView`

### 3.6 Integration Points

- **App shell**: `HelpButton` rendered globally in the app layout
- **Tutorial system**: "Take the Tour" button bridges help → tutorial
- **helpEntries.ts**: Imported in `main.tsx` or app initialization
- **Tests**: Regression suite validates all entries have required fields

---

## 4. UX Design (Senior UX Designer Perspective)

### 4.1 Design Principles
1. **Non-intrusive**: Help is always available but never interrupts the workflow.
2. **Contextually smart**: The most relevant content is surfaced first.
3. **Scannable**: Accordion pattern lets users scan titles without being overwhelmed.
4. **Connected**: Related entries create a web of discoverable documentation.
5. **Consistent**: Every entry follows the same structure (summary → steps → tips → related).

### 4.2 Visual Design Specifications

| Element | Specification |
|---------|---------------|
| FAB button | Primary color, 48px circle, drop shadow (`shadow-lg`), subtle scale on hover (1.05) |
| Drawer width | 100% mobile, 448px max desktop |
| Section headers | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Contextual background | `bg-accent/50 rounded-lg p-3` |
| Accordion trigger | `text-sm font-medium`, 12px vertical padding |
| Accordion content | `text-sm text-muted-foreground`, 16px bottom padding |
| Related badges | shadcn `Badge variant="secondary"`, clickable, `text-xs` |
| Search input | Standard input with `pl-9` for search icon, `Search` icon at `left-3` |

### 4.3 Interaction Patterns

1. **Opening**: Drawer slides in from right. First contextual entry auto-expands.
2. **Searching**: Debounce-free (immediate filter). Replaces contextual/all sections with flat results.
3. **Expanding**: Multiple accordion items can be open simultaneously (`type="multiple"`).
4. **Cross-navigation**: Click related badge → target expands + smooth scroll to it.
5. **Closing**: Click outside, press Escape, or click X button.
6. **Tour launch**: Close drawer first, then 300ms delay before tutorial starts (prevents visual conflict).

### 4.4 Responsive Behavior
- **Mobile (< 640px)**: Drawer fills entire width. All content stacks vertically.
- **Desktop (≥ 640px)**: Drawer maxes at 448px width. Content has horizontal padding.

### 4.5 Accessibility
- Sheet uses `role="dialog"` with `aria-modal="true"` (from shadcn/radix).
- Search input has placeholder text for screen readers.
- Accordion items use proper `aria-expanded` states.
- Focus is trapped within the drawer when open.
- ESC key closes the drawer.

---

## 5. Testing Strategy

### 5.1 Automated Tests (`helpEntries.test.ts`)

| Test Category | What's Validated |
|---------------|-----------------|
| Completeness | Registry has > 20 entries |
| Summaries | Every entry has a non-empty summary (> 10 chars) |
| Titles | Every entry has a non-empty title |
| Steps (regression) | Specific feature slugs must have ≥ 2 steps |
| Routes (regression) | Specific page slugs must have a route field |
| Route matching | Exact match `/`, parameterized `/applications/:id`, no false positives |
| Search | Keyword search returns expected entries; empty search returns all |

### 5.2 Regression Lists
Two curated lists (`SLUGS_REQUIRING_STEPS` and `SLUGS_REQUIRING_ROUTE`) ensure that critical entries always have the required fields. New features must be added to these lists.

---

## 6. File Inventory

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/helpRegistry.ts` | Registry singleton + query functions | ~67 |
| `src/lib/helpEntries.ts` | All help entry registrations | ~718 |
| `src/components/HelpButton.tsx` | FAB trigger component | ~22 |
| `src/components/HelpDrawer.tsx` | Drawer UI with search + contextual sections | ~235 |
| `src/test/maui/helpEntries.test.ts` | Regression test suite | ~114 |

---

## 7. Content Authoring Guide

### Adding a new help entry:

1. Choose a unique `slug` (kebab-case, matches feature name).
2. Write a `title` (2-5 words, noun-based).
3. Write a `summary` (1-3 sentences explaining what + why).
4. Add 2-6 `steps` (sequential, verb-led instructions).
5. Add 0-4 `tips` (non-sequential advice, edge cases, shortcuts).
6. Set `route` if the entry is page-specific.
7. Add `keywords` for search terms not already in title/summary.
8. Add `relatedSlugs` for cross-links to related features.
9. Add slug to test regression lists (`SLUGS_REQUIRING_STEPS`, `SLUGS_REQUIRING_ROUTE`).
10. Run tests to verify.

### Entry quality checklist:
- [ ] Summary answers "What is this?" in one sentence
- [ ] Steps start with a verb ("Click", "Navigate", "Enter")
- [ ] Tips provide non-obvious value (not just restating steps)
- [ ] Keywords include synonyms users might search for
- [ ] Related slugs link to genuinely connected features
