

## Plan: Reorder Pipeline — Resume First, Background Cover Letter & Dashboard

### What Changes

**1. Pipeline reorder + rename**

The generation pipeline currently runs: Scrape → Branding → Analyze → Research → Cover Letter → Dashboard → Done.

New order:
1. **Reviewing Job** (renamed from "Scraping Job")
2. **Branding**
3. **Analyzing**
4. **Researching**
5. **Resume** — generate a tailored resume using `generate-resume` edge function
6. **Complete** (from the user's perspective)

After resume completes, the user is navigated to the application detail page with the Resume tab open. Cover Letter and Dashboard continue generating in the background.

**2. Two-phase completion model**

- **Phase 1 (foreground)**: Steps 1–5. When resume is saved, mark `generation_status = "resume-complete"` and navigate the user to `/applications/:id`.
- **Phase 2 (background)**: Cover Letter → Dashboard. Save each as they complete. Update `generation_status` to `"complete"` when both finish. The existing `BackgroundJobsBanner` and realtime polling already handle showing progress.

**3. UI indication on ApplicationDetail**

When the user lands on the detail page with a completed resume but cover letter/dashboard still generating, show a small banner or badge on those tabs indicating "Generating..." so they know more content is coming.

---

### Files to Edit

**`src/components/GenerationProgressBar.tsx`**
- Update `PipelineStage` type: rename `"scraping"` → keep but relabel, add `"resume"` stage
- New stage order: `reviewing-job`, `branding`, `analyzing`, `research`, `resume`, `complete`
- Remove `cover-letter` and `dashboard` from the visible progress bar (they happen silently after)

**`src/lib/backgroundGenerator.ts`**
- Add `"resume"` to `GenerationJob.status` union
- Reorder `runPipeline`:
  - After Research, call `generateOptimizedResume` (needs user's `resumeText` from profiles table)
  - Save `resume_html` and mark `generation_status = "resume-complete"`
  - Update job status to `"complete"` (from foreground perspective)
  - Then continue with cover letter + dashboard in the same async flow, updating DB as each finishes
- Fetch `resumeText` from profiles table at pipeline start (via supabase client)

**`src/pages/NewApplication.tsx`**
- After `startFullGeneration` returns the appId, navigate to `/applications/:id` once the background job reaches `"resume"` stage completion (subscribe to job updates)
- Remove the inline pipeline execution (currently `handleAnalyze` runs everything synchronously) — delegate entirely to `backgroundGenerator`
- Update `PipelineStage` references for the new stage names

**`src/pages/ApplicationDetail.tsx`**
- Add "Generating..." badges on Cover Letter and Dashboard tabs when `generation_status` is between `"resume-complete"` and `"complete"`
- The existing polling + realtime subscription will auto-refresh content as it arrives

**`src/lib/api/jobApplication.ts`**
- Add `resume_html` to the `saveJobApplication` type signature (already works via `as any`, but clean it up)

---

### Technical Details

- The `generate-resume` edge function requires `resumeText` + `jobDescription`. The pipeline will fetch `resumeText` from the `profiles` table using the authenticated user's ID at pipeline start. If no resume text exists, it skips resume generation and goes straight to cover letter.
- The `GenerationJob.status` will use `"complete"` to signal foreground completion (resume done). A new internal flag or DB `generation_status` value (`"background-generating"`) tracks that cover letter/dashboard are still in progress.
- The `NewApplication` page will listen to the background job and navigate as soon as status hits resume-complete, giving the user near-instant perceived completion.

