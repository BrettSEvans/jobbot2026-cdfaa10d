

## Plan: Add Cover Letter Upload + Update Messaging

### What Changes

**1. Update `CoverLetterCard.tsx`** — Add file upload (PDF/DOCX/TXT), update copy to be encouraging

- Add a drop zone similar to ResumeCard's pattern (drag & drop or click to browse)
- Accept `.pdf`, `.docx`, `.txt` files (max 2MB)
- On upload: extract text via the existing `extract-resume-text` edge function (works for PDFs) or read `.txt`/`.docx` client-side
- Extracted text populates the textarea (user can edit before saving)
- Update card description: "Upload a cover letter, paste one in, or just jot down a few ideas about what makes you a great fit. **ResuVibe will do the rest!**"
- Update the empty-state tip: Instead of "Highly recommended", soften to: "Don't have a polished cover letter? No problem — even a few bullet points about your strengths will give the AI enough to craft something great."
- Update placeholder text: "Upload a file above, paste a cover letter here, or just jot down a few ideas — e.g. 'I'm passionate about scaling infrastructure' or 'I led a team of 12 engineers'…"

**2. Update `src/lib/helpEntries.ts`** (lines 174-193) — master-cover-letter entry

- Update steps to include "Upload a PDF, DOCX, or TXT file, or paste/type your content directly."
- Add tip: "Don't have a cover letter? Just jot down a few ideas — ResuVibe will do the rest."

**3. Update `src/lib/tutorial/steps.ts`** (lines 70-79) — tutorial bubble

- Update body text to mention upload option and the "jot down ideas" encouragement.

**4. Add QA test to `src/lib/qaEntries.ts`** — new test case for cover letter upload

- Test case: upload PDF → text populates textarea, upload TXT → text populates, type a few ideas → save succeeds.

### Technical Details

- **No new edge function needed**: For PDF extraction, reuse `extract-resume-text` (it just extracts text from any PDF). For `.txt` files, read client-side with `FileReader`. For `.docx`, read client-side as text (basic extraction).
- **No new storage bucket needed**: The cover letter text is stored in the existing `master_cover_letter` column on profiles. The uploaded file is only used transiently to extract text — no persistent file storage required.
- **No database changes**: The `master_cover_letter` text column already exists on profiles.

### Files to Edit
- `src/components/profile/CoverLetterCard.tsx` — major rewrite (add upload zone, update copy)
- `src/lib/helpEntries.ts` — update master-cover-letter entry
- `src/lib/tutorial/steps.ts` — update tutorial step text
- `src/lib/qaEntries.ts` — add new QA test case

