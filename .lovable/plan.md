

# Plan: Master Cover Letter, Smart Reminders, Auto-Logout, and PII Review

## 1. Master Cover Letter on Profile Page

### Database
- Add `master_cover_letter text` column to `profiles` table (nullable, default null).

### Profile Page (`src/pages/Profile.tsx`)
- Add new state: `masterCoverLetter` / `setMasterCoverLetter`, tracked in dirty state as `coverLetter` card.
- Add a new `CoverLetterCard` component in `src/components/profile/CoverLetterCard.tsx` placed in the right column below the ResumeCard.

### CoverLetterCard UI
- Title: "Master Cover Letter (Optional)"
- Subtitle: "Paste or write your go-to cover letter. When provided, the AI uses your voice and style as a starting point instead of generating from scratch --- making every tailored letter sound more like you."
- A `<Textarea>` with 10 rows.
- If empty, show a subtle info banner: "Adding a master cover letter is highly recommended. It helps the AI capture your unique voice, making each application feel personal rather than generic."

### Backend wiring
- Add `"master_cover_letter"` to `ALLOWED_PROFILE_FIELDS` in `src/lib/api/profile.ts`.
- Add `master_cover_letter` to `UserProfile` interface.
- In `getProfileContextForPrompt()`, append master cover letter content to the context string when present.

### Cover Letter Generation (`supabase/functions/tailor-cover-letter/index.ts`)
- The `profileContext` string already gets passed through. No edge function change needed --- the master cover letter will flow via the existing `profileContext` parameter automatically.

---

## 2. Smart Reminder System (1st, 3rd, 7th application)

### Storage
- Use `localStorage` key `rv_cl_nudge` storing `{ dismissed: number[], lastActive: string }`.
- `dismissed` tracks which milestones (1, 3, 7) have been shown.
- `lastActive` is an ISO date of last app access; if > 30 days ago, reset `dismissed` to `[]`.

### Implementation
- Create `src/hooks/useCoverLetterNudge.ts`:
  - Fetches profile to check if `master_cover_letter` is set. If set, never nudge.
  - Counts total applications (query `job_applications` count).
  - On milestones 1, 3, 7: returns `{ shouldNudge: true, message: string }`.
  - Exposes `dismiss()` to mark the current milestone as seen.

### UI Integration
- In `src/pages/ApplicationDetail.tsx`, render a dismissible banner at the top (below the header) when `shouldNudge` is true.
- Banner text: "Add your master cover letter to make every application sound like you. Without it, AI generates a generic voice."
- CTA button: "Add Cover Letter" linking to `/profile`.
- "Remind me later" dismiss button.

---

## 3. Auto-Logout for Security

### Approach
- Industry standard for sensitive PII apps: **30 minutes of inactivity**.
- Create `src/hooks/useIdleTimeout.ts`:
  - Tracks `mousemove`, `keydown`, `click`, `scroll`, `touchstart` events.
  - After 30 minutes of no activity, calls `supabase.auth.signOut()` and redirects to `/auth`.
  - Shows a warning toast at 25 minutes: "You'll be logged out in 5 minutes due to inactivity."
  - Resets timer on any interaction.
- Wire into `App.tsx` for all authenticated routes.

---

## 4. PII Risk Review

### Findings

**Low risk (acceptable):**
- Resume text, cover letters, job descriptions --- core product data, stored behind RLS. Acceptable.
- Email stored in `profiles.email` --- used for admin lookup, protected by RLS. Acceptable.

**Medium risk (flagged):**
1. **`dangerouslySetInnerHTML` in `TutorialDemo.tsx`** --- Uses internally-generated HTML (tutorial demo content), not user input. Low actual risk but worth noting.
2. **`console.warn` / `console.error` calls** --- Some include error objects that could contain user context in stack traces. Acceptable for dev, but Sentry should be the production channel. No action needed now.

**No critical PII risks found.** The app uses RLS consistently, whitelists profile fields, and doesn't log sensitive data to console.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `profiles` table | Add `master_cover_letter text` column |
| `src/components/profile/CoverLetterCard.tsx` | New card component |
| `src/pages/Profile.tsx` | Add CoverLetterCard to layout, wire dirty state |
| `src/lib/api/profile.ts` | Add field to interface, whitelist, and prompt context |
| `src/hooks/useCoverLetterNudge.ts` | New hook for smart reminders |
| `src/pages/ApplicationDetail.tsx` | Render nudge banner |
| `src/hooks/useIdleTimeout.ts` | New hook for 30-min auto-logout |
| `src/App.tsx` | Wire idle timeout hook |
| `src/lib/helpEntries.ts` | Add help entry for master cover letter |

