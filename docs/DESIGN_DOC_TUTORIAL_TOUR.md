# Design Document: Interactive Tutorial Tour System

> **Version**: 1.0  
> **Date**: 2026-03-10  
> **Authors**: Engineering, UX Design, Product Management  
> **Status**: Production — 17 guided steps across 4 routes

---

## 1. Executive Summary

The Tutorial Tour is a step-by-step guided walkthrough that highlights UI elements using a spotlight mask and positioned tooltip bubble. It navigates users across multiple routes, waits for elements to appear, handles missing elements gracefully, and supports both "live" mode (real data) and "demo" mode (synthetic content for new users with no applications).

**Key differentiator**: The tour is linked to the Help System — each tutorial step references a `helpSlug`, creating a bidirectional connection between guided walkthroughs and reference documentation.

---

## 2. Product Requirements (Product Manager Perspective)

### 2.1 Problem Statement
New users in feature-rich SaaS applications face a steep learning curve. Without guided onboarding, users may not discover key workflows (creating applications, generating assets, downloading PDFs) and churn before experiencing value.

### 2.2 Goals
| Goal | Metric | Target |
|------|--------|--------|
| Time to first value | Minutes from signup to first asset download | < 10 min |
| Onboarding completion | % of new users who complete the tour | > 60% |
| Feature awareness | % of users who discover Vibe Edit within first session | > 50% |
| Re-engagement | Tour restart rate from Help menu | > 5% of returning users |

### 2.3 User Stories
1. **As a new user**, I want a guided tour that shows me the key features so I can start using the app immediately.
2. **As a new user with no applications**, I want to see realistic demo content during the tour so I understand what the product does.
3. **As a returning user**, I want to restart the tour anytime from the Help menu.
4. **As a user**, I want to skip or exit the tour at any point without losing progress.
5. **As a user on mobile**, I want the tour to adapt to smaller screens.

### 2.4 Tour Lifecycle
```
New user signs up → Approval → Onboarding Wizard → Tour auto-launches
                                                          │
User completes 3 applications ──▶ Tour banner hidden      │
                                                          │
Any time: Help Drawer → "Take the Tour" ──────────────────┘
```

### 2.5 Modes
| Mode | Trigger | Behavior |
|------|---------|----------|
| **Live** | User has ≥ 1 application | Tour navigates to real application detail pages |
| **Demo** | User has 0 applications | Tour navigates to `/tutorial-demo` with synthetic content |

### 2.6 Non-Goals
- No per-step completion tracking (the tour is a single flow, not a checklist).
- No conditional branching (all users see the same steps).
- No video or animated content within tooltips.

---

## 3. Architecture (Senior Engineer Perspective)

### 3.1 System Overview

```
┌──────────────────────────────────────────────────────────┐
│                      App Shell                            │
│                                                           │
│  ┌──────────────┐   ┌─────────────────────────────────┐  │
│  │ useTutorial  │──▶│       TutorialOverlay           │  │
│  │   (hook)     │   │  ┌─────────────┐ ┌───────────┐ │  │
│  │              │   │  │SpotlightMask│ │TutorialBub│ │  │
│  │ • state      │   │  │  (SVG mask) │ │  (tooltip) │ │  │
│  │ • auto-start │   │  └─────────────┘ └───────────┘ │  │
│  │ • dismiss    │   └─────────────────────────────────┘  │
│  └──────────────┘                 ▲                       │
│         │                         │ getTutorialSteps()    │
│         │                    ┌────┴─────────────────┐    │
│         │                    │  tutorial/registry.ts │    │
│         │                    │  Map<id, TutorialStep>│    │
│         │                    └────▲─────────────────┘    │
│         │                         │ registerTutorialStep()│
│         │                    ┌────┴─────────────────┐    │
│         │                    │  tutorial/steps.ts    │    │
│         │                    │  17 step definitions  │    │
│         │                    └──────────────────────┘    │
│         │                                                │
│         │  validates helpSlug ┌─────────────────────┐    │
│         └───────────────────▶│  helpRegistry.ts     │    │
│                               │  (help system)       │    │
│                               └─────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Data Model

```typescript
interface TutorialStep {
  id: string;                    // Unique step identifier (e.g. "welcome", "paste-url")
  helpSlug: string;              // Links to helpRegistry entry — step is hidden if slug not found
  targetSelector: string;        // CSS selector for the element to spotlight (e.g. '[data-tutorial="job-url"]')
  title: string;                 // Tooltip heading
  body: string;                  // Tooltip description (1-3 sentences)
  placement: "top" | "bottom" | "left" | "right";  // Tooltip position relative to target
  route?: string;                // Route the user must be on (auto-navigates if wrong)
  order: number;                 // Sequence position (1-based, gaps allowed)
  prerequisiteSelector?: string; // Element to click before polling for target (e.g. click a tab first)
}
```

**Design decisions**:
- `helpSlug` coupling: Steps are silently filtered out if their `helpSlug` doesn't exist in the help registry. This prevents orphaned tutorial steps.
- `targetSelector` uses `data-tutorial` attributes (not CSS classes) to decouple styling from tutorial targeting.
- `prerequisiteSelector` enables steps that require UI state changes (e.g., clicking a tab to reveal content).
- `order` allows gaps (1, 2, 3, 6, 7...) for easy insertion without renumbering.

### 3.3 Step Registry (`tutorial/registry.ts`)

```typescript
const steps = new Map<string, TutorialStep>();

function registerTutorialStep(step: TutorialStep): void
function getTutorialSteps(): TutorialStep[]  // Sorted by order, filtered by valid helpSlug
```

The `getTutorialSteps()` function filters out any step whose `helpSlug` doesn't exist in `helpRegistry`, then sorts by `order`. This ensures the tour gracefully degrades if help entries are removed.

### 3.4 Step Definitions (`tutorial/steps.ts`)

17 steps organized into three groups:

| Order | ID | Route | Target | Group |
|-------|-----|-------|--------|-------|
| 1 | welcome | `/` | `[data-tutorial="app-table"]` | Core Navigation |
| 2 | pipeline-view | `/` | `[data-tutorial="pipeline-tab"]` | Core Navigation |
| 3 | new-app | `/` | `[data-tutorial="new-app-btn"]` | Core Navigation |
| 4 | paste-url | `/applications/new` | `[data-tutorial="job-url"]` | Core Navigation |
| 5 | upload-resume | `/profile` | `[data-tutorial="resume-input"]` | Profile Setup |
| 6 | master-cover-letter | `/profile` | `[data-tutorial="master-cover-letter"]` | Profile Setup |
| 7 | view-assets | `/applications/:id` | `[data-tutorial="asset-tabs"]` | Asset Tour |
| 8 | pipeline-nudge | `/applications/:id` | `[data-tutorial="pipeline-link"]` | Asset Tour |
| 9 | tour-dashboard | `/applications/:id` | `[data-tutorial="dashboard-tab"]` | Asset Tour |
| 10 | tour-cover-letter | `/applications/:id` | `[data-tutorial="cover-letter-tab"]` | Asset Tour |
| 11 | tour-resume | `/applications/:id` | `[data-tutorial="resume-tab"]` | Asset Tour |
| 12 | tour-industry-assets | `/applications/:id` | `[data-tutorial="industry-assets-grid"]` | Asset Tour |
| 13 | tour-change-asset | `/applications/:id` | `[data-tutorial="change-asset-btn"]` | Asset Tour |
| 14 | tour-revision-history | `/applications/:id` | `[data-tutorial="revision-history"]` | Asset Tour |
| 15 | tour-refine-ai | `/applications/:id` | `[data-tutorial="refine-ai-btn"]` | Asset Tour |
| 16 | generate-asset | `/applications/:id` | `[data-tutorial="generate-btn"]` | Asset Tour |
| 17 | download-asset | `/applications/:id` | `[data-tutorial="download-btn"]` | Asset Tour |

### 3.5 State Management (`useTutorial.ts`)

```typescript
interface TutorialState {
  dismissed: boolean;  // Persisted to localStorage
}

function useTutorial() → {
  showTutorial: boolean;        // Should the tutorial banner be visible?
  isTutorialActive: boolean;    // Is the overlay currently rendering?
  tutorialMode: "live" | "demo";// Which mode to use
  startTutorial(): void;        // Dispatches custom event to activate
  dismissTutorial(): void;      // Hides banner + persists dismissal
  stopTutorial(): void;         // Stops overlay without persisting
}
```

**State flow**:
```
┌─────────────┐    CustomEvent     ┌──────────────┐
│ useTutorial ├───────────────────▶│TutorialOverlay│
│   (hook)    │◀───────────────────┤  (component)  │
└──────┬──────┘                    └───────────────┘
       │
       ▼
  localStorage (rv-tutorial-state)
  { dismissed: boolean }
```

**Auto-launch logic**:
1. User is authenticated
2. `localStorage` has no prior tutorial state
3. User has 0 completed applications
4. After 1-second delay → dispatch `CustomEvent` to start

**Banner visibility** (`showTutorial`):
- Not dismissed AND completed applications < 3

**Mode selection** (`tutorialMode`):
- If total applications > 0 → "live" (uses real application data)
- If total applications === 0 → "demo" (uses synthetic content)

### 3.6 Overlay Controller (`TutorialOverlay.tsx`)

The overlay orchestrates navigation, element waiting, and fallback handling.

**Lifecycle for each step**:
```
1. Check if current route matches step.route
   ├── NO → navigate(targetRoute), set waitingForElement = true
   └── YES → continue

2. Click prerequisiteSelector if specified (e.g. click a tab)

3. Poll for targetSelector every 50ms (max 120 attempts = 6 seconds)
   ├── FOUND → scrollIntoView, render SpotlightMask + TutorialBubble
   └── NOT FOUND → advanceOrFallback()

4. advanceOrFallback():
   ├── consecutiveSkips ≤ 3 → advance to next step
   └── consecutiveSkips > 3 → show fallback bubble (centered, no spotlight)
```

**Route resolution**:
- Demo mode: `/applications/:id` steps redirect to `/tutorial-demo`
- Live mode: `:id` is replaced with the user's most recent application ID
- If no application ID available → skip the step

**Fallback mode**: After 3+ consecutive skipped steps, a centered bubble (without spotlight) appears showing the current step's content. This prevents the tour from silently ending when elements can't be found.

### 3.7 SpotlightMask (`SpotlightMask.tsx`)

An SVG overlay that dims the entire page except for the target element.

**Implementation**:
```
Full-screen SVG → 
  <mask>
    White rect (full viewport) — reveals backdrop
    Black rect (target bounds + padding) — creates cutout
  </mask>
  Backdrop rect with mask applied (rgba black, 0.3 dark / 0.5 light)
  Pulse ring around cutout (primary color, 2px stroke, animate-pulse)
```

**Measurements**:
- Target element bounds via `getBoundingClientRect()`
- Padding: 8px on all sides
- Border radius: 8px
- Updates on: resize, scroll (with `capture: true`)
- Z-index: 9998

**Theme awareness**:
- Dark mode: backdrop opacity 0.3 (lighter dim to avoid obscuring dark UI)
- Light mode: backdrop opacity 0.5 (standard dim)

### 3.8 TutorialBubble (`TutorialBubble.tsx`)

A positioned tooltip showing step content and navigation controls.

**Positioning algorithm**:
```
1. Get target element bounds
2. Calculate bubble position based on placement (top/bottom/left/right)
3. On mobile (< 640px): force placement to "bottom" regardless of step config
4. Clamp to viewport with 12px margin on all sides
5. Bubble dimensions: 320px wide, ~200px height estimate
```

**Content structure**:
```
┌─────────────────────────────────────┐
│  [Title]                        [X] │
│  [Body text]                        │
│                                     │
│  ● ● ● ○ ○ ○ ○     [◄] [Next ▶]  │
│  (dot indicators)   (navigation)    │
└─────────────────────────────────────┘
```

**Theme-aware styling**:
- Dark mode: Light background (`hsl(0,0%,98%)`) with dark text — inverted for contrast
- Light mode: `bg-card` with `border-border` and `shadow-2xl`

**Animations**:
- Entry: `opacity-0 scale-95` → `opacity-100 scale-100` over 300ms
- Recalculation: 50ms delay before showing to prevent flash of wrong position

**Keyboard support**:
- ESC key exits the tour

**Navigation controls**:
- Dot indicators: One per step, current step highlighted with primary color
- Back button: Ghost variant, hidden on first step
- Next button: Primary variant, changes to "Finish" on last step

### 3.9 Demo Mode (`TutorialDemo.tsx` + `demoContent.ts`)

For users with zero applications, the tour uses a dedicated `/tutorial-demo` page with synthetic content:

**Demo content** (`demoContent.ts`):
- `demoDashboardHtml`: Executive dashboard for "Acme Corp — Senior Product Manager"
- `demoCoverLetterHtml`: Sample cover letter
- `demoResumeHtml`: Sample resume
- `demoIndustryAssets[]`: RAID Log, Architecture Diagram, Executive Report

The `TutorialDemo` page renders the same layout as `ApplicationDetail` but with hardcoded demo data, ensuring all `data-tutorial` selectors are present for the tour to target.

---

## 4. UX Design (Senior UX Designer Perspective)

### 4.1 Design Principles
1. **Progressive disclosure**: Show one step at a time, don't overwhelm.
2. **Spatial awareness**: The spotlight draws attention to the exact UI element being discussed.
3. **Escapable**: Users can exit at any point via X button, ESC key, or "Skip" action.
4. **Resilient**: If an element can't be found, the tour degrades gracefully (skip or fallback bubble).
5. **Contextual**: The tour navigates to the right page automatically — users don't need to know where things are.

### 4.2 Visual Design Specifications

| Element | Specification |
|---------|---------------|
| Backdrop | SVG mask, rgba black, opacity varies by theme |
| Spotlight cutout | Target bounds + 8px padding, 8px border-radius |
| Pulse ring | Primary color, 2px stroke, CSS `animate-pulse` |
| Tooltip bubble | 320px wide, 20px padding, 12px border-radius (`rounded-xl`) |
| Tooltip shadow | Dark: `shadow-xl`; Light: `shadow-2xl` + `border-border` |
| Dot indicators | 6px circles, primary (active) / muted (inactive) |
| Entry animation | `scale-95 opacity-0` → `scale-100 opacity-100` over 300ms |
| Z-indices | Backdrop: 9997, Mask: 9998, Bubble: 9999 |

### 4.3 Interaction Flow

```
User triggers tour (auto or manual)
    │
    ▼
Step 1: Welcome (Applications page)
    │ User clicks "Next"
    ▼
Step 2: Pipeline View (same page)
    │ User clicks "Next"
    ▼
Step 3: New App Button (same page)
    │ User clicks "Next"
    ▼
Step 4: Paste URL (auto-navigates to /applications/new)
    │ User clicks "Next"
    ▼
Step 5: Upload Resume (auto-navigates to /profile)
    │ User clicks "Next"
    ▼
Step 6: Master Cover Letter (same page)
    │ User clicks "Next"
    ▼
Steps 7-17: Asset Tour (auto-navigates to /applications/:id or /tutorial-demo)
    │ User clicks "Finish" on last step
    ▼
Tour ends, overlay removed
```

### 4.4 Edge Cases & Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| Target element not found within 6s | Skip to next step |
| 3+ consecutive skips | Show fallback bubble (centered, no spotlight) |
| No application ID in live mode | Skip `:id` route steps |
| User navigates away during tour | Tour continues from current step when element appears |
| Window resize during step | Spotlight + bubble reposition immediately |
| Mobile (< 640px) | All bubbles forced to "bottom" placement |

### 4.5 Accessibility
- Tooltip uses `role="dialog"` with `aria-modal="true"` and `aria-label={step.title}`.
- Close button has `aria-label="Skip tutorial"`.
- ESC key closes the tour.
- Dot indicators are decorative (no aria roles needed).
- The backdrop blocks all clicks on underlying content to prevent confusion.

### 4.6 Tutorial Banner (Pre-Tour)
Before the tour starts, a dismissible banner appears on the Applications page for users with < 3 completed applications. The banner says "Take a quick tour" and has two actions:
- **Start Tour**: Launches the overlay
- **Dismiss**: Hides the banner permanently (persisted to localStorage)

---

## 5. Integration with Help System

The tutorial and help systems are bidirectionally linked:

| Direction | Mechanism |
|-----------|-----------|
| Tutorial → Help | Each step has a `helpSlug` that references a help entry. Steps are filtered out if the help entry is removed. |
| Help → Tutorial | The Help Drawer has a "Take the Tour" button that closes the drawer and starts the tutorial. |

This ensures:
1. Every tutorial step has corresponding reference documentation.
2. Users who want more detail can open help after the tour.
3. Removing a help entry gracefully removes its tutorial step.

---

## 6. File Inventory

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/tutorial/types.ts` | TutorialStep interface | ~18 |
| `src/lib/tutorial/registry.ts` | Step registry + sorted getter | ~18 |
| `src/lib/tutorial/steps.ts` | 17 step definitions | ~195 |
| `src/lib/tutorial/demoContent.ts` | Synthetic HTML content for demo mode | ~136 |
| `src/hooks/useTutorial.ts` | State management, auto-launch, mode detection | ~113 |
| `src/components/tutorial/TutorialOverlay.tsx` | Orchestrator: navigation, polling, fallback | ~194 |
| `src/components/tutorial/TutorialBubble.tsx` | Positioned tooltip with navigation | ~153 |
| `src/components/tutorial/SpotlightMask.tsx` | SVG dimming mask with cutout | ~95 |
| `src/pages/TutorialDemo.tsx` | Demo page for users with 0 applications | ~varies |

---

## 7. Data Attribute Convention

All tutorial-targetable elements use `data-tutorial` attributes:

```html
<!-- In component JSX -->
<div data-tutorial="app-table">...</div>
<button data-tutorial="new-app-btn">...</button>
<input data-tutorial="job-url" />
<textarea data-tutorial="master-cover-letter" />
```

**Naming convention**: kebab-case, descriptive of the element's purpose (not its component name).

**Rule**: Never use CSS class names or IDs for tutorial targeting. `data-tutorial` attributes are the contract between components and the tutorial system.

---

## 8. Adding a New Tutorial Step

1. Add `data-tutorial="your-target"` attribute to the target element in the component.
2. Ensure a corresponding help entry exists (or create one in `helpEntries.ts`).
3. Add `registerTutorialStep()` call in `tutorial/steps.ts`:
   ```typescript
   registerTutorialStep({
     id: "your-step-id",
     helpSlug: "your-help-slug",       // Must exist in helpRegistry
     targetSelector: '[data-tutorial="your-target"]',
     title: "Step Title",
     body: "1-3 sentences explaining what this element does.",
     placement: "bottom",              // top | bottom | left | right
     route: "/your-page",              // Route user must be on
     order: 18,                        // Next available number
     prerequisiteSelector: undefined,  // Optional: click this first
   });
   ```
4. If the step requires a tab click or other UI action first, set `prerequisiteSelector`.
5. Test the tour end-to-end to verify element polling and positioning.
