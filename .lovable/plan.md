## Plan: Comprehensive Resume Health Dashboard + Auto-Score After Generation

### Overview

Three major changes: (1) upgrade the edge function prompt to return a richer analysis (parsing rate, impact analysis, repetition audit, professionalism checks), (2) rebuild the ATS card as a multi-module "Resume Health Dashboard" with sidebar-style sections, and (3) auto-trigger ATS scoring after resume generation completes, showing a delta vs. the user's baseline resume score. (4) ensure help and QA functionality are updated to include ATS changes

### 1. Expand the Data Model

`**src/lib/api/atsScore.ts**` — Extend `AtsScoreResult` with new fields:

```typescript
export interface AtsScoreResult {
  score: number;               // overall ATS match score
  parseRate: number;           // 0-100 section parse success
  parsedSections: string[];    // e.g. ["Contact", "Experience", "Education"]
  missingSections: string[];   // e.g. ["Skills", "LinkedIn"]
  impactAnalysis: {
    strongBullets: number;
    weakBullets: number;
    weakExamples: { text: string; suggestion: string }[];
  };
  repetitionAudit: {
    overusedWords: { word: string; count: number; synonyms: string[] }[];
  };
  professionalismFlags: string[];   // e.g. "Unprofessional email", "No LinkedIn"
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  keywordGroups: Record<string, string[]>;
  _inputHash?: string;
  _baselineScore?: number;  // score of baseline resume (from profile)
}
```

Also add a new function `scoreBaselineResume()` that scores the user's raw profile resume text against the JD and stores it as `_baselineScore` on the result, so the UI can show the delta.

### 2. Upgrade Edge Function Prompt

`**supabase/functions/score-ats-match/index.ts**` — Expand the system prompt to require the LLM to also return:

- `parseRate` + `parsedSections` / `missingSections` (simulated ATS parse)
- `impactAnalysis` with strong/weak bullet counts and rewrite suggestions for weak bullets
- `repetitionAudit` with overused verbs and synonym suggestions
- `professionalismFlags` (email quality, LinkedIn presence, summary length)

Use tool calling (structured output) instead of raw JSON to guarantee schema compliance.

### 3. Rebuild the ATS Card UI

`**src/components/AtsScoreCard.tsx**` — Full rewrite as a multi-section dashboard:

```text
┌─────────────────────────────────────────────────┐
│  Resume Health Score: 72          ▲+15 vs base  │
│  ████████████████░░░░░░  72/100                 │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │  Content Area                        │
│          │                                      │
│ ● ATS    │  [Active section content]            │
│   Match  │                                      │
│ ○ Impact │                                      │
│ ○ Repe-  │                                      │
│   tition │                                      │
│ ○ Format │                                      │
└──────────┴──────────────────────────────────────┘
```

Four tabbed sections inside the card (not full-page tabs, internal mini-tabs):

- **ATS Match**: keyword badges (matched/missing), keyword groups, suggestions
- **Impact Analysis**: strong vs weak bullet count, weak examples with "suggested rewrite" chips
- **Repetition**: overused words with count + synonym pills
- **Formatting**: professionalism flags, parse rate gauge, missing sections

Color system: green (>=80), yellow (50-79), red (<50). Delta badge shows `▲+N` green or `▼-N` red vs baseline.

The card will be **collapsed by default** showing just the score bar + delta, expandable to the full dashboard.

### 4. Auto-Trigger After Resume Generation

`**src/pages/ApplicationDetail.tsx**` — Watch the resume asset job status. When it transitions to `"complete"` and `state.resumeHtml` is populated:

```typescript
const resumeJob = useAssetJob(id, "resume");
const prevResumeJobStatus = useRef<string>();

useEffect(() => {
  if (prevResumeJobStatus.current !== "complete" && resumeJob?.status === "complete" && state.resumeHtml && state.jobDescription) {
    handleAtsRescan();  // auto-score
  }
  prevResumeJobStatus.current = resumeJob?.status;
}, [resumeJob?.status, state.resumeHtml]);
```

Also trigger after the main pipeline completes (watch the main background job for `"complete"` status when resumeHtml appears).

### 5. Baseline Score for Delta

When `handleAtsRescan` runs, if no `_baselineScore` exists on the current ATS result, first score the user's raw `profiles.resume_text` against the JD (fire-and-forget, store as `_baselineScore`). Then score the tailored resume. The delta is `tailoredScore - baselineScore`.

### 6. Tests

`**src/test/maui/atsScore.test.ts**` — Add tests for:

- Extended `AtsScoreResult` shape validation (new fields)
- Delta calculation (`score - _baselineScore`)
- Auto-trigger logic (job status transition detection)
- Impact analysis weak bullet detection
- Repetition audit word counting  
  
  
6. UPdates    
endure help and QA functionality is updated

### Files to modify


| File                                          | Change                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `supabase/functions/score-ats-match/index.ts` | Expanded prompt with tool calling for structured output; new analysis modules |
| `src/lib/api/atsScore.ts`                     | Extended interface, baseline scoring function, delta support                  |
| `src/components/AtsScoreCard.tsx`             | Full rewrite as multi-section Resume Health Dashboard                         |
| `src/pages/ApplicationDetail.tsx`             | Auto-trigger ATS scan after resume generation completes; pass baseline delta  |
| `src/test/maui/atsScore.test.ts`              | New regression tests for expanded features                                    |
