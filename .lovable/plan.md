

## Why the Resume Was Made Up

The root cause: when you upload a PDF resume on your Profile page, it gets stored as a **binary PDF file** in storage. However, the resume generation pipeline calls `getActiveResumeText()`, which reads from `profiles.resume_text` — a **plain text field** in your profile. Since no code ever extracts the text content from your uploaded PDF into that field, the AI receives an empty string and invents a resume from scratch.

In short: **uploaded PDF resumes are never parsed into text**, so the AI has nothing to work with.

## Plan

### 1. Create a PDF text extraction edge function

- New function `extract-resume-text/index.ts`
- Accepts a storage path, downloads the PDF from the `resume-uploads` bucket
- Uses the Lovable AI gateway (e.g. `google/gemini-2.5-flash` with the PDF as input) to extract the full text content from the PDF
- Returns the extracted text

### 2. Auto-extract text on resume upload

- After `uploadResumePdf()` in `src/lib/api/profile.ts` successfully uploads and inserts the record, invoke the new edge function to extract text
- Save the extracted text into `profiles.resume_text` automatically
- This ensures every PDF upload populates the text field the AI pipeline depends on

### 3. Backfill existing uploads

- Add a one-time call: when `getActiveResumeText()` returns empty but the user has an active resume in `user_resumes`, trigger extraction on demand and cache the result in `profiles.resume_text`
- This covers your current Appen application and any other existing uploads

### Technical Details

- The edge function will use the service role key to download from the private `resume-uploads` bucket
- PDF content will be sent to the AI gateway as a base64-encoded document for text extraction (Gemini supports PDF input natively)
- The extracted text replaces `profiles.resume_text` so all downstream generation (resume, cover letter, profile context) benefits automatically
- No database schema changes needed — `profiles.resume_text` already exists

