

# LLM Coding Prompt: Fix Tutorial Tour Dropout and Add Demo Mode

Below is the prompt you can hand to an LLM to implement both fixes.

---

## Prompt

You are working on a React + TypeScript application called JobBot. It has a 14-step interactive tutorial overlay system. Two problems need to be fixed:

### Problem 1: Tour closes prematurely after the "Swap Any Asset" step

**Symptom:** When the user clicks "Next" after step 10 (`tour-change-asset`, targeting `[data-tutorial="change-asset-btn"]`), the tour closes instead of advancing to step 11 (`tour-revision-history`).

**Root cause:** The element polling in `TutorialOverlay.tsx` (lines 80-104) gives each step only 60 attempts at 50ms (3 seconds) to find its target element. Steps 11-14 target elements like `[data-tutorial="revision-history"]`, `[data-tutorial="refine-ai-btn"]`, `[data-tutorial="generate-btn"]`, and `[data-tutorial="download-btn"]`. These elements are conditionally rendered — they only appear when the user is viewing a specific asset tab that has content, revisions, etc. If the element is not in the DOM within 3 seconds, the step is skipped. If *multiple consecutive steps* fail to find their elements, the overlay reaches the end of the step list and calls `onDismiss()`, closing the tour entirely.

**Fix required:**
1. When a step's target element is not found after polling, skip to the next step instead of closing the tour. The current code at lines 92-100 already does this for non-final steps, but the cascade of multiple skips in quick succession can cause the overlay to dismiss. Add a safeguard: if more than 3 consecutive steps are skipped, show a fallback "center of screen" bubble for the current step rather than skipping it — display the step content without a spotlight so the user still reads the explanation.
2. Increase `maxAttempts` from 60 to 120 (6 seconds) to give route transitions and lazy-loaded content more time to render.
3. When navigating to a new step that requires a different tab to be visible (e.g., the revision history is only visible when viewing a specific asset), consider programmatically clicking the relevant tab before polling. Add an optional `prerequisiteSelector` field to `TutorialStep` that, if present, is clicked before polling begins (e.g., clicking the first dynamic asset tab to ensure revision history and refine buttons are visible).

**Files to modify:**
- `src/lib/tutorial/types.ts` — add optional `prerequisiteSelector?: string` to `TutorialStep`
- `src/components/tutorial/TutorialOverlay.tsx` — implement the prerequisite click, increase poll timeout, add consecutive-skip fallback
- `src/lib/tutorial/steps.ts` — add `prerequisiteSelector` to steps 11-14 that need a specific asset tab to be active

### Problem 2: New users see empty/broken screens during the tour

**Symptom:** Steps 5-14 navigate to `/applications/:id` and highlight real application content. A brand-new user who has never created an application sees nothing — the tour either skips all those steps or shows empty states.

**Fix required:** Implement a **demo mode** for the tutorial so new users see pre-built demo content during the tour.

**Approach:**
1. Create a static set of demo HTML strings in a new file `src/lib/tutorial/demoContent.ts`. Include:
   - `demoDashboardHtml` — a small representative executive dashboard
   - `demoCoverLetterHtml` — a sample tailored cover letter
   - `demoResumeHtml` — a sample resume
   - `demoIndustryAssets` — array of 3 objects `{ title: string, description: string, html: string }` representing sample dynamic assets (e.g., RAID Log, Architecture Diagram, Executive Report)
   - Keep the HTML simple and self-contained (inline styles). Content should be for a fictional "Acme Corp — Senior Product Manager" role.

2. Add a `mode` field to the tutorial context: `"live" | "demo"`.
   - In `useTutorial.ts`, determine the mode: if the user has at least 1 non-deleted application, use `"live"` mode. Otherwise, use `"demo"` mode.
   - Pass this mode through to `TutorialOverlay`.

3. In `"demo"` mode:
   - Skip steps 1-4 (the onboarding flow steps for `/`, `/applications/new`, `/profile`) since there is nothing to show yet — or keep steps 1-2 and skip 3-4.
   - For steps 5-14 (`/applications/:id`), instead of navigating to a real application, navigate to a new route `/tutorial-demo` that renders a **read-only mock** of the `ApplicationDetail` page populated with the demo content.
   - Create `src/pages/TutorialDemo.tsx` — a simplified, read-only version of `ApplicationDetail` that renders the demo data with the same `data-tutorial` attributes so the spotlight and bubble positioning work identically.
   - Register the `/tutorial-demo` route in `App.tsx`.
   - In `TutorialOverlay.tsx`, when mode is `"demo"` and the step route is `/applications/:id`, navigate to `/tutorial-demo` instead.

4. In `"live"` mode (user has applications):
   - Behavior is unchanged — the tour navigates to the user's most recent real application.

**Files to create:**
- `src/lib/tutorial/demoContent.ts` — static demo HTML content
- `src/pages/TutorialDemo.tsx` — read-only mock application detail page

**Files to modify:**
- `src/hooks/useTutorial.ts` — expose `tutorialMode: "live" | "demo"`
- `src/components/tutorial/TutorialOverlay.tsx` — accept mode, route to `/tutorial-demo` in demo mode
- `src/App.tsx` — register `/tutorial-demo` route

### Summary of deliverables
1. Tour no longer closes prematurely — graceful fallback when elements are missing
2. New users get a polished demo walkthrough with realistic sample content
3. Existing users continue to see their real application data during the tour

