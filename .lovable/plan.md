# Plan: Reduce Initial Generation to Resume + Cover Letter Only & Reorder Tabs

## Problem

The current pipeline generates 7 assets on "Analyze & Generate" (cover letter, resume, executive report, RAID log, architecture diagram, roadmap, plus free-tier preview assets), causing long wait times.

## Changes

### 1. Trim the background pipeline (`src/lib/backgroundGenerator.ts`)

- **Remove the parallel asset generation block** (lines ~280–456): Delete the `generateExecReport`, `generateRaidLog`, `generateArchDiagram`, `generateRoadmap` functions and their `Promise.allSettled` call.
- **Move resume generation inline** alongside the cover letter (sequential, not in a parallel batch). After resume completes, generate the cover letter directly..
- **Update status tracking**: Remove `generating-assets` status and parallel progress counters. The pipeline becomes: scraping → analyzing → resume→  cover-letter  → complete.
- **Save both results** in a single final save call.

### 2. Reorder tabs in `src/pages/ApplicationDetail.tsx`

- Swap the `primaryTabs` array order (line ~259) so Resume comes before Cover Letter:
  ```ts
  const primaryTabs = [
    { id: "resume", label: "Resume", icon: FileUser },
    { id: "cover-letter", label: "Cover Letter", icon: Mail },
  ];
  ```
- Update the default `activeView` state from `"cover-letter"` to `"resume"` (line 68).

### 3. Update `GenerationJob` type and banner (`src/lib/backgroundGenerator.ts`, `src/components/BackgroundJobsBanner.tsx`)

- Remove `"generating-assets" | "executive-report" | "raid-log" | "architecture-diagram" | "roadmap"` from the status union type.
- The banner component will continue to work since it reads generic job state.

### 4. Update `GenerationProgressBar` if it references removed stages

- Will check and remove any stage definitions for the dropped asset types.

**Result**: The pipeline will only run: scrape → analyze → generate cover letter → generate resume → complete. Other assets (executive report, RAID log, etc.) remain accessible via the existing "Propose Materials" flow for on-demand generation.