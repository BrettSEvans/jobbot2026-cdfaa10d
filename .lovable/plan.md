

## Plan: Ghost Option 3 Image, 10-Day + 7-Day Triggers, One-Time Per Job

### 1. Update GhostPromptDialog (`src/components/GhostPromptDialog.tsx`)

- Replace the bouncing 👻 emoji with `<img src={ghostImg}>` using `ghost-option-3.png`
- Add `stage` prop (`'applied' | 'interviewing'`)
- Dynamic copy:
  - Applied (10 days): title "It's been 10 days…", body "You applied to **{company}** and haven't heard back."
  - Interviewing (7 days): title "It's been a week…", body "You've been interviewing with **{company}** with no update."
- Keep the bounce animation, purple gradient, and same button layout

### 2. Update Applications.tsx (`src/pages/Applications.tsx`)

**Change applied trigger to 10 days:**
- Line 114: `FOURTEEN_DAYS` → `TEN_DAYS = 10 * 24 * 60 * 60 * 1000`

**Add 7-day interviewing trigger:**
- New `staleInterviewingApp` useMemo checking `pipeline_stage === 'interviewing'` for >7 days
- Separate localStorage key `dismissed_ghost_interview_prompts` — ensures each job only triggers once
- New `dismissInterviewGhostPrompt` and `markInterviewAsGhosted` callbacks

**One-time-per-job guarantee:**
- Both triggers use localStorage arrays of dismissed app IDs (existing pattern from `dismissed_bookmarked_prompts`)
- When user clicks "Mark as Ghosted" OR "Not yet", the app ID is added to the dismiss list — prompt never fires again for that job
- Applied prompt takes priority; interviewing prompt only shows if no applied prompt is active

**Remove preview mode:**
- Replace the hardcoded `open={true} companyName="Acme Corp"` dialog (lines 750-756) with the two real wired dialogs

### Files changed

| File | Change |
|------|--------|
| `src/components/GhostPromptDialog.tsx` | Use ghost-option-3.png image, add `stage` prop, dynamic copy |
| `src/pages/Applications.tsx` | 10-day applied trigger, 7-day interview trigger, remove preview, one-time-per-job localStorage tracking |

