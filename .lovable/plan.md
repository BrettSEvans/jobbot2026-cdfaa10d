

## Resume Health: Unified Quality Panel

### Problem

The Resume tab currently presents **4 separate, manually-triggered tools** stacked vertically:
1. **Keyword Gap Analysis** — click "Analyze Keywords", wait for AI, then optionally "Optimize Resume"
2. **Resume Diff Viewer** — click "View Changes", wait for AI diff
3. **ATS Format Compliance** — click "Check Format", instant client-side scan
4. **Bullet Coach** — click "Coach My Bullets", wait for AI, then per-bullet Q&A workflow

Each requires its own button click, loading state, and mental model. A user must click through all 4 to understand their resume's readiness. Most will stop after 1-2.

### Proposed Design

Replace the 4 stacked cards with a single **"Resume Health"** panel that:

1. **Auto-runs on load** — ATS Format (instant, client-side) and Keyword Analysis (AI call) fire automatically when the resume tab is active. No manual "Analyze" buttons.

2. **Summary bar with traffic-light indicators** — A single collapsed row shows 3 health dimensions as colored dots:

```text
┌──────────────────────────────────────────────────────────┐
│  📊 Resume Health                                        │
│  🟢 Keywords 87%    🟡 Format 72%    🟢 Bullets 91%     │
│                                          [View Changes ▾]│
└──────────────────────────────────────────────────────────┘
```

   - **Green** (≥80%): Good to go — no action needed
   - **Yellow** (60-79%): Could improve — optional drill-in
   - **Red** (<60%): Needs attention — expanded by default

3. **Click-to-expand sections** — Each dimension expands inline to show details. Only red/yellow sections auto-expand. Green sections stay collapsed (users skip what's fine).

4. **Bullet Coach becomes contextual** — Instead of a separate panel, weak bullets surface inside the Keywords or a dedicated "Bullet Quality" section with the same red/yellow/green indicator. The interactive Q&A rewrite flow stays but lives inside the expanded section.

5. **View Changes stays as a secondary action** — The diff viewer is a different mental model (before/after comparison, fabrication review). It becomes a button in the health panel header rather than its own card — keeping it accessible but not cluttering the quality checks.

### Technical Plan

**New component: `ResumeHealthPanel.tsx`**
- Orchestrates all 3 checks from a single component
- Auto-triggers keyword extraction + ATS format check on mount (when resume + JD exist)
- Computes bullet score from BulletCoach analysis
- Renders summary bar with 3 traffic-light badges
- Each section is a collapsible that auto-expands if score < 80%

**Refactor existing components into sub-panels:**
- `KeywordGapAnalysis` → becomes an internal section (no outer Card wrapper, no manual trigger button)
- `AtsFormatCompliance` → runs automatically, renders as section
- `BulletCoach` → renders as section with score badge
- All keep their existing detailed UI when expanded

**Changes to `ApplicationDetail.tsx`:**
- Replace the 4 separate component renders with a single `<ResumeHealthPanel>` 
- `ResumeDiffViewer` moves to a "View Changes" button in the health panel header (opens as a dialog or inline section)
- Pass all callbacks (onOptimize, onApplyFix, onAcceptFabrication, onRevertFabrication) through

**No backend changes needed** — all existing edge functions and APIs remain the same.

### Key UX Improvements
- **Zero-click insight**: Users see their resume health immediately, no manual scanning required
- **Decision-driven**: Red/yellow/green lets users decide what's worth fixing vs. shipping as-is
- **Reduced cognitive load**: One panel instead of four; green sections collapse away
- **Progressive disclosure**: Summary → drill into problem areas → take action

