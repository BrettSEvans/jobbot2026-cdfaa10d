# Prompts to Recreate the Help & Tutorial Systems in a New Lovable App

> **Instructions**: Use these prompts sequentially in a new Lovable project.  
> Each prompt references the design docs (`DESIGN_DOC_HELP_SYSTEM.md` and `DESIGN_DOC_TUTORIAL_TOUR.md`).  
> Copy the design docs into the new project's `docs/` folder first, then reference them in conversation.

---

## Pre-Requisite

Before running any prompts, copy both design documents into your new project:
- `docs/DESIGN_DOC_HELP_SYSTEM.md`
- `docs/DESIGN_DOC_TUTORIAL_TOUR.md`

Then add them to the project's knowledge base (Settings → Manage Knowledge → add both files).

---

## Prompt 1: Help Registry & Data Model

```
Refer to docs/DESIGN_DOC_HELP_SYSTEM.md, Section 3 (Architecture).

Create the help system foundation:

1. Create `src/lib/helpRegistry.ts` with:
   - A `HelpMeta` interface with fields: slug (string), title (string), summary (string), steps (string[] optional), tips (string[] optional), relatedSlugs (string[] optional), route (string optional), keywords (string[] optional)
   - A singleton Map<string, HelpMeta> as the registry
   - Five exported functions:
     a. registerHelp(meta: HelpMeta) — adds to registry
     b. getAllHelp() — returns all entries sorted alphabetically by title
     c. getHelpBySlug(slug) — direct Map lookup
     d. getHelpForRoute(pathname) — filters entries whose route pattern matches the current path. Convert ":param" segments to regex "[^/]+" for parameterized matching.
     e. searchHelp(query) — lowercase substring search across title, summary, steps, tips, and keywords joined together

2. Create `src/lib/helpEntries.ts` as a side-effect module that imports registerHelp and registers entries for your app's pages and features. Start with 3-5 entries for your main pages following the template pattern in the design doc (slug, title, summary, steps, tips, route, keywords, relatedSlugs).

3. Import helpEntries.ts in your main.tsx or App.tsx so entries are registered at startup.

Do NOT create any UI components yet — just the data layer.
```

---

## Prompt 2: Help Button & Drawer UI

```
Refer to docs/DESIGN_DOC_HELP_SYSTEM.md, Sections 3.5 and 4 (UI Components and UX Design).

Create the Help UI components:

1. Create `src/components/HelpButton.tsx`:
   - A floating action button (FAB) fixed at bottom-right (bottom-6 right-6), z-50
   - 48x48px circle with shadow-lg, primary color, HelpCircle icon from lucide-react
   - Scale to 1.05 on hover with transition
   - Toggles a HelpDrawer component open/closed

2. Create `src/components/HelpDrawer.tsx`:
   - Uses shadcn Sheet component, slides from right, max width sm:max-w-md
   - TWO zones: sticky header (flex-shrink-0) and scrollable body (flex-1 overflow-y-auto)
   - Sticky header contains:
     a. Title "Help & Documentation"
     b. Search input with Search icon (pl-9)
     c. Dynamic section label
   - Scrollable body contains:
     a. CONTEXTUAL section: entries matching current route via getHelpForRoute(pathname), shown in bg-accent/50 rounded container. First entry auto-expands when drawer opens.
     b. ALL HELP TOPICS section: remaining entries (excludes contextual to avoid duplication)
     c. SEARCH MODE: when query is typed, show filtered results replacing both sections
   - Each entry renders as an Accordion item (type="multiple") with:
     - Title as trigger
     - Summary paragraph
     - "How to use" ordered list (from steps)
     - "Tips" unordered list (from tips)
     - "Related:" row of clickable Badge components (from relatedSlugs) that expand+scroll to the target entry
   - Use useLocation() to get current pathname for contextual matching

3. Render HelpButton in your app's root layout so it appears on every page.

Follow the exact visual specs from Section 4.2 of the design doc — use semantic Tailwind tokens (text-muted-foreground, bg-accent, etc.), not hardcoded colors.
```

---

## Prompt 3: Help Entry Content

```
Refer to docs/DESIGN_DOC_HELP_SYSTEM.md, Section 7 (Content Authoring Guide).

Now populate helpEntries.ts with entries for ALL pages and features in this app. For each entry follow this pattern:

1. slug: kebab-case, unique, matches the feature name
2. title: 2-5 words, noun-based
3. summary: 1-3 sentences answering "What is this and why does it matter?"
4. steps: 2-6 items, each starting with a verb ("Click", "Navigate", "Enter")
5. tips: 0-4 items with non-obvious advice, edge cases, or shortcuts
6. route: the route pattern this entry applies to (use ":param" for dynamic segments)
7. keywords: search terms not already in the title or summary
8. relatedSlugs: links to genuinely connected features

Cover every page in the app's router and every major feature component. Aim for 15-30 entries depending on app complexity. Make sure every page-level entry has a route field.
```

---

## Prompt 4: Help System Tests

```
Refer to docs/DESIGN_DOC_HELP_SYSTEM.md, Section 5 (Testing Strategy).

Create `src/test/helpEntries.test.ts` with vitest tests:

1. "registry is populated with entries" — getAllHelp().length > threshold
2. "every entry has a non-empty summary" — iterate all, check summary.length > 10
3. "every entry has a non-empty title" — iterate all, check title.length > 0
4. "slugs requiring steps have ≥ 2 steps" — create a SLUGS_REQUIRING_STEPS array of feature slugs that should have steps, iterate and verify
5. "slugs requiring route have a route field" — create a SLUGS_REQUIRING_ROUTE array of page-specific slugs, iterate and verify
6. "exact route matching works" — getHelpForRoute("/") returns expected entries
7. "parameterized route matching works" — getHelpForRoute("/some-page/uuid-here") returns expected entries
8. "unrelated routes return empty" — getHelpForRoute("/nonexistent") returns []
9. "search finds entries by keyword" — searchHelp("keyword") returns expected
10. "empty search returns all" — searchHelp("").length === getAllHelp().length

Import helpEntries.ts in a beforeAll() block to populate the registry before tests run.
```

---

## Prompt 5: Tutorial System Foundation

```
Refer to docs/DESIGN_DOC_TUTORIAL_TOUR.md, Sections 3.2-3.4 (Data Model, Registry, Steps).

Create the tutorial system data layer:

1. Create `src/lib/tutorial/types.ts` with the TutorialStep interface:
   - id: string (unique step identifier)
   - helpSlug: string (must reference an existing helpRegistry entry)
   - targetSelector: string (CSS selector using data-tutorial attributes)
   - title: string (tooltip heading)
   - body: string (1-3 sentence description)
   - placement: "top" | "bottom" | "left" | "right"
   - route?: string (optional, route user must be on)
   - order: number (sequence position)
   - prerequisiteSelector?: string (optional, element to click first)

2. Create `src/lib/tutorial/registry.ts`:
   - A Map<string, TutorialStep> singleton
   - registerTutorialStep(step) — adds to map
   - getTutorialSteps() — returns steps sorted by order, filtered to only include steps whose helpSlug exists in helpRegistry (import getHelpBySlug)

3. Create `src/lib/tutorial/steps.ts`:
   - Import registerTutorialStep
   - Register 5-10 steps covering your app's main workflow
   - Each step must have a corresponding helpSlug that exists in helpEntries.ts
   - Use data-tutorial="..." attributes as targetSelectors
   - Start with steps for: welcome/home page, creating new items, viewing details, key actions

4. Add data-tutorial="..." attributes to the corresponding UI elements in your components.

Do NOT create the overlay UI yet — just the data layer and element targeting.
```

---

## Prompt 6: Tutorial UI Components

```
Refer to docs/DESIGN_DOC_TUTORIAL_TOUR.md, Sections 3.6-3.8 (Overlay, SpotlightMask, TutorialBubble).

Create the tutorial overlay system:

1. Create `src/components/tutorial/SpotlightMask.tsx`:
   - Full-screen SVG overlay (fixed inset-0, z-[9998], pointer-events-none)
   - Uses SVG <mask> with a white full-screen rect and a black cutout rect at target bounds
   - Cutout has 8px padding, 8px border-radius
   - Backdrop fill: rgba(0,0,0,0.3) for dark theme, rgba(0,0,0,0.5) for light theme
   - Animated pulse ring (primary color, 2px stroke) around the cutout
   - Recalculates on resize and scroll (with capture: true)

2. Create `src/components/tutorial/TutorialBubble.tsx`:
   - 320px wide tooltip with 20px padding, rounded-xl
   - Positioned relative to target based on step.placement (top/bottom/left/right)
   - On mobile (<640px): force placement to "bottom"
   - Clamped to viewport with 12px margins
   - Content: title (font-semibold), body (text-sm opacity-80), close X button
   - Navigation: dot indicators (1 per step, primary=active, muted=inactive) + Back/Next buttons
   - Last step shows "Finish" instead of "Next"
   - ESC key exits tutorial
   - Entry animation: scale-95 opacity-0 → scale-100 opacity-100 over 300ms
   - Theme-aware: dark mode uses light bg (inverted), light mode uses card bg
   - Z-index: 9999

3. Create `src/components/tutorial/TutorialOverlay.tsx`:
   - Receives onDismiss callback
   - Loads steps via getTutorialSteps()
   - For each step:
     a. Check if route matches current pathname (handle parameterized routes)
     b. If wrong route → navigate()
     c. If prerequisiteSelector → click it
     d. Poll for targetSelector every 50ms, max 120 attempts (6 seconds)
     e. Found → scrollIntoView + render SpotlightMask + TutorialBubble
     f. Not found → skip to next step (or show fallback after 3+ consecutive skips)
   - Fallback mode: centered bubble with dark backdrop, no spotlight
   - Click-blocking backdrop div at z-[9997]

Use semantic Tailwind tokens. Follow the exact z-index layering from the design doc.
```

---

## Prompt 7: Tutorial State Management

```
Refer to docs/DESIGN_DOC_TUTORIAL_TOUR.md, Section 3.5 (State Management).

Create `src/hooks/useTutorial.ts`:

1. State persisted to localStorage (key: "{app-prefix}-tutorial-state"):
   - dismissed: boolean

2. Hook returns:
   - showTutorial: true when not dismissed AND user has < 3 completed items (query your main data table)
   - isTutorialActive: boolean (is the overlay currently showing?)
   - startTutorial(): dispatches a CustomEvent to activate the overlay
   - dismissTutorial(): dispatches event to stop + persists dismissed=true to localStorage
   - stopTutorial(): dispatches event to stop WITHOUT persisting (for overlay's onDismiss)

3. Auto-launch logic:
   - If user is authenticated AND localStorage has no prior state AND user has 0 completed items
   - After 1-second delay, dispatch the start event

4. Cross-instance communication via CustomEvent (not React state) so any component can listen.

5. Wire the overlay:
   - In your app's root layout, listen for the custom event
   - When active, render TutorialOverlay with onDismiss={stopTutorial}

6. Add a "Take the Tour" button in your HelpDrawer header that calls startTutorial() (close drawer first, then 300ms delay before starting tour).
```

---

## Prompt 8: Final Integration & Polish

```
Refer to both design docs for integration details.

Final integration steps:

1. Verify all data-tutorial attributes are present on target elements.

2. Add a "Take the Tour" button in the HelpDrawer sticky header (before the search input):
   - Button variant="outline" size="sm" className="w-full justify-start"
   - BookOpen icon + "Take the Tour" text
   - onClick: close drawer, setTimeout(() => startTutorial(), 300)

3. Ensure helpEntries.ts is imported early in your app initialization.

4. Ensure tutorial/steps.ts is imported (it registers steps as a side effect).

5. Test the full flow:
   - New user: tour auto-launches after 1 second
   - Help drawer: "Take the Tour" starts tour
   - Tour navigates between routes
   - Missing elements are gracefully skipped
   - ESC key exits at any point
   - Mobile: bubbles default to bottom placement

6. Run the help entry tests to verify all entries pass validation.
```

---

## Notes for Adaptation

When recreating in your own app, you'll need to customize:

1. **Help entries**: Write entries for YOUR app's pages and features, not the ones in the source app.
2. **Tutorial steps**: Target YOUR app's UI elements with `data-tutorial` attributes.
3. **Route patterns**: Match YOUR app's routing structure.
4. **Demo content**: If you want demo mode for new users, create synthetic content that matches YOUR app's domain.
5. **Branding**: Replace brand references (the source uses `BRAND.name` and `BRAND.storagePrefix`).
6. **Completion criteria**: Adjust the "< 3 completed" threshold to match your app's definition of "onboarded."
7. **localStorage keys**: Use your own prefix to avoid collisions.
