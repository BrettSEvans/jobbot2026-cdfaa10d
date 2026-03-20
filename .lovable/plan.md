

## Add Resume Regeneration with Resume Picker

### What We're Building
A "Regenerate Resume" button on the Resume tab that lets users re-generate their tailored resume, with an option to select which uploaded resume PDF to use as the baseline (defaulting to the active/primary resume).

### Current State
- Resume tab shows Copy HTML, Download HTML, Download PDF buttons but no regenerate option
- `generateOptimizedResume` API calls the `generate-resume` edge function
- The background pipeline fetches resume text from `profiles.resume_text` — NOT from `user_resumes` table
- `user_resumes` table stores uploaded PDFs with `is_active` flag but there's no text extraction visible
- `job_applications.source_resume_id` column exists but is unused during generation

### Files to Modify

**1. `src/pages/ApplicationDetail.tsx`**
- Add a "Regenerate Resume" button alongside existing action buttons
- When clicked, show a dialog/popover with:
  - A Select dropdown listing all user resumes (from `user_resumes` table), with the active one pre-selected
  - A "Regenerate" confirm button
- On confirm: fetch the selected resume's PDF from storage, extract text (client-side or via existing extraction), call `generateOptimizedResume`, save result + update `source_resume_id` on the application
- Show loading state during regeneration

**2. `src/lib/api/resumeGeneration.ts`**
- Add optional `sourceResumeId` parameter so it can be passed to the edge function or saved on the application

**3. Resume text extraction**
- The system currently relies on `profiles.resume_text` (a single text field)
- Need to add a helper that downloads a PDF from `resume-uploads` storage bucket and extracts text
- Use the existing `parse-resume` or a lightweight client-side PDF text extraction (pdf.js)
- Alternatively, add a `resume_text` column to `user_resumes` table and extract on upload

### Recommended Approach — Add `resume_text` to `user_resumes`

**Migration**: Add `resume_text text` column to `user_resumes` table. This stores extracted text per resume, enabling any resume to be used for generation without re-extracting every time.

**`supabase/functions/extract-resume-text/index.ts`** (new): Edge function that downloads a PDF from storage and extracts text using a PDF parser, returning the text. Called after upload from the ResumeManager component.

**`src/components/ResumeManager.tsx`**: After successful upload, call the extraction edge function and update the `resume_text` column.

**`src/pages/ApplicationDetail.tsx`**: 
- Fetch `user_resumes` list for the current user
- Add regenerate button + resume picker dialog
- On regenerate: use selected resume's `resume_text`, call `generateOptimizedResume`, save result

**`src/lib/backgroundGenerator.ts`**: Update the initial pipeline to read from `user_resumes` (active resume's text) instead of `profiles.resume_text`, falling back to `profiles.resume_text` for backward compatibility.

### UI Flow
1. User clicks "Regenerate Resume" button (with RefreshCw icon)
2. Dialog opens with a Select dropdown showing all uploaded resumes, active one pre-selected with a badge
3. User picks a resume (or keeps default) and clicks "Regenerate"
4. Loading spinner replaces the button, toast shows progress
5. New resume HTML replaces the old one, revision saved

### Technical Details

| File | Action |
|------|--------|
| Migration SQL | Add `resume_text text` to `user_resumes` |
| `supabase/functions/extract-resume-text/index.ts` | New — PDF text extraction edge function |
| `src/components/ResumeManager.tsx` | Call extraction after upload, store text |
| `src/pages/ApplicationDetail.tsx` | Add regenerate button + resume picker dialog |
| `src/lib/api/resumeGeneration.ts` | Accept optional `sourceResumeId` param |
| `src/lib/backgroundGenerator.ts` | Use active resume from `user_resumes` instead of `profiles.resume_text` |

