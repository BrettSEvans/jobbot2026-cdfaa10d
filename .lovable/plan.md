

# Resume File Management — Multi-Resume Upload, Naming, Selection, and Deletion

## Red Team Review Process

Each section below reflects a sequential review: the UX/UI designer defines the user-facing behavior, the systems architect validates the data model and access patterns, and the senior engineer audits the implementation for edge cases, race conditions, and downstream breakage.

---

## 1. UX/UI Designer Review

### Current State
The Profile page has a drag-and-drop PDF upload zone that fires and forgets -- no feedback after upload, no file list, no way to manage files. The `resume_text` field in profiles is a separate concept (pasted highlights for prompt injection). The uploaded PDF is stored at a fixed path `{userId}/resume.pdf`, meaning only one file can exist.

### Proposed User Experience

**Profile Page — Resume Card Rework:**

```text
┌─────────────────────────────────────────────────┐
│  📄 Resume Files                                │
│  Upload PDF resumes to use as templates when    │
│  generating tailored resumes for job apps.       │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ ★ Senior_PM_Resume_2026.pdf               │  │
│  │   Uploaded Mar 2, 2026                    │  │
│  │   [Rename] [Delete]              ACTIVE   │  │
│  ├───────────────────────────────────────────┤  │
│  │ ○ Career_Change_Resume.pdf                │  │
│  │   Uploaded Feb 15, 2026                   │  │
│  │   [Rename] [Delete]                       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [+ Upload Another Resume]  (compact button)    │
│                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Resume highlights (recommended)                │
│  ┌───────────────────────────────────────────┐  │
│  │ [textarea - paste key highlights]         │  │
│  └───────────────────────────────────────────┘  │
│                                        [Save]   │
└─────────────────────────────────────────────────┘
```

**Key UX decisions:**

1. **Empty state**: Full drag-and-drop zone (current behavior). Once at least one file exists, the drop zone collapses to a compact "+ Upload Another Resume" button.

2. **File naming**: On upload, the file name defaults to the original PDF filename (minus extension). A small "Rename" (pencil icon) button allows inline editing. The name is a user-facing label, not the storage path.

3. **Active selection**: Radio buttons next to each file. Clicking one sets it as the active resume. A green "ACTIVE" badge marks the selected one. Only one can be active at a time.

4. **Deletion**: Trash icon per row. Clicking shows a confirmation dialog ("Delete this resume? This cannot be undone."). If the deleted file was the active one, the most recently uploaded remaining file becomes active automatically.

5. **Limit**: Cap at 5 uploaded resumes. After 5, the upload button is disabled with helper text.

### Job Creation Flow — Resume Selection

**When creating a new application (`NewApplication.tsx`):**

Currently the user picks a "Resume Style" (prompt style). Add a second selector:

```text
Resume Style:   [▾ Traditional Corporate ]
Source Resume:  [▾ Senior_PM_Resume_2026 ★ ]
```

- The "Source Resume" dropdown lists all uploaded resumes by their user-given name.
- The active resume is pre-selected and marked with a star.
- If only one resume exists, the dropdown is still shown but pre-selected (no ambiguity).
- If zero resumes exist, show a text link: "Upload a resume on your Profile page" instead of the dropdown.

The selected resume's `storage_path` is passed to the generation pipeline, which downloads the PDF content at generation time.

---

## 2. Systems Architect Review

### Data Model

**New table: `user_resumes`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid NOT NULL | FK-free reference to auth user |
| `file_name` | text NOT NULL | User-editable display name (defaults to original filename) |
| `storage_path` | text NOT NULL | Path in `resume-uploads` bucket |
| `is_active` | boolean NOT NULL DEFAULT false | Only one per user should be true |
| `uploaded_at` | timestamptz NOT NULL DEFAULT now() | |

**RLS policies:**
- SELECT/INSERT/UPDATE/DELETE: `user_id = auth.uid()`

**Database function: `set_active_resume(p_resume_id uuid)`**

```sql
-- SECURITY DEFINER to bypass RLS for the atomic toggle
-- Validates the resume belongs to the calling user before toggling
UPDATE user_resumes SET is_active = false WHERE user_id = auth.uid();
UPDATE user_resumes SET is_active = true WHERE id = p_resume_id AND user_id = auth.uid();
```

This prevents race conditions where two concurrent calls could leave multiple resumes active.

### Storage

- Upload path changes from `{userId}/resume.pdf` to `{userId}/{uuid}.pdf`
- Existing storage RLS policies (INSERT, UPDATE) already scope by `(storage.foldername(name))[1] = auth.uid()::text`
- Need to add a DELETE policy on `storage.objects` for `resume-uploads` bucket so users can remove their own files

### Downstream Impact on Generation Pipeline

Currently `backgroundGenerator.ts` calls `getActiveResumeText()` which reads `profiles.resume_text`. This is the pasted text highlights and remains unchanged.

The new flow adds a second input: the actual PDF file content. The pipeline must:
1. Receive `source_resume_id` from the job creation form
2. Look up `user_resumes` row to get `storage_path`
3. Download the PDF from storage
4. Extract text from the PDF (server-side, in the edge function)
5. Merge with `resume_text` highlights and pass both to the AI

If `source_resume_id` is null (user has no uploads), fall back to `resume_text` only (current behavior). This ensures backward compatibility with existing applications.

**Modified table: `job_applications`** — add column:

| Column | Type | Notes |
|--------|------|-------|
| `source_resume_id` | uuid NULL | FK-free reference to `user_resumes.id` used for this generation |

This captures which resume was used, so the user can see it later and re-generate with a different one.

---

## 3. Senior Engineer Review

### Edge Cases and Failure Modes

1. **Deletion of active resume**: When deleting the active resume, the API must atomically set the next most recent upload as active. If no resumes remain, `is_active` is moot. The UI should handle the empty state gracefully.

2. **Deletion of resume referenced by existing jobs**: `job_applications.source_resume_id` references a resume that may be deleted later. This is acceptable — the generated `resume_html` is already stored on the application. The reference is informational only. The UI should show "Deleted resume" if the lookup fails.

3. **File name collisions in storage**: Using UUID-based paths (`{userId}/{uuid}.pdf`) eliminates collisions entirely.

4. **Concurrent uploads**: Each upload inserts a new row and calls `set_active_resume`. The SECURITY DEFINER function serializes the toggle, so the last upload wins as active. This is the correct behavior.

5. **Backward compatibility**: Existing applications have no `source_resume_id`. The generation pipeline already falls back to `resume_text` from profiles, so nothing breaks.

6. **Impersonation (test users)**: Test users don't have real auth IDs, so they can't upload to storage. The upload UI should be hidden when impersonating, same as current behavior. Test users rely on `resume_text` only.

### Files to Create/Modify

**New migration SQL:**
- Create `user_resumes` table with RLS
- Create `set_active_resume` function
- Add DELETE policy on `storage.objects` for `resume-uploads`
- Add `source_resume_id` column to `job_applications`

**Modified files:**
- `src/lib/api/profile.ts` — add `listUserResumes()`, `deleteResume()`, `renameResume()`, `setActiveResume()`, update `uploadResumePdf()` to use unique paths and insert DB rows
- `src/pages/Profile.tsx` — rework Resume card to show file list, active selection, rename, delete, conditional drop zone
- `src/pages/NewApplication.tsx` — add "Source Resume" dropdown, pass `source_resume_id` to background generator
- `src/lib/backgroundGenerator.ts` — accept `sourceResumeId`, download PDF content from storage, pass to `generate-resume` edge function
- `supabase/functions/generate-resume/index.ts` — accept optional `resumePdfText` field alongside existing `resumeText`

