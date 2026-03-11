

## Plan: Remove Free Trial Limits, Align Pricing, Extract Contact Info from Resume Upload

### Part 1: Remove Portfolio Limits & Fix Pricing Text

**`src/lib/subscriptionTiers.ts`**
- Set `portfolioItemsPerApp: -1` for free tier
- Update free tier features: `"5 resumes"` → `"5 applications per month"`, remove `"2 portfolio items per resume"`, add `"Resume & cover letter per app"`

No changes needed in Landing.tsx or Pricing.tsx — they render features directly from `TIER_CONFIGS`.

### Part 2: Block Duplicate Free Trial Signups (Passive Collection from Resume)

Instead of forcing users to enter phone/email/LinkedIn at signup, we extract these from the resume when uploaded.

**Database migration:**
- Add `phone`, `linkedin_url` columns (text, nullable) to `profiles` table with unique partial indexes (only enforce uniqueness when non-null)
- Create `check_duplicate_trial_signup(p_email text, p_phone text, p_linkedin text)` — a `SECURITY DEFINER` function that returns true if any *other* profile has matching phone or linkedin_url. Email is already enforced by auth.

**New edge function or extend `extract-resume-text`:**
- Create a new edge function `extract-resume-contact-info` that uses Gemini to scan the resume PDF and return structured JSON: `{ phone, email, linkedin_url }`.
- This is a separate, lightweight call from the text extraction — runs in parallel or sequentially after upload.

**`src/components/profile/ResumeCard.tsx`** — After resume upload succeeds:
- Show a spinner overlay on the card with text "Gathering resume information..." for at least 2 seconds
- Call `extract-resume-contact-info` with the storage path
- On response, populate `phone` and `linkedin_url` on the profile (save to DB)
- Present newly found phone and LinkedIn as editable fields in the IdentityCard (they appear after extraction completes)

**`src/components/profile/IdentityCard.tsx`** — Add phone and LinkedIn URL fields:
- Two new optional Input fields: "Phone" and "LinkedIn URL"
- Pre-populated from profile data; user can edit and save
- These are always visible (empty until resume scan fills them)

**`src/pages/Profile.tsx`** — Wire new state for `phone` and `linkedinUrl`:
- Add state vars, include in dirty tracking, include in save payload

**`src/lib/api/profile.ts`** — Add `phone` and `linkedin_url` to:
- `UserProfile` interface
- `getProfile()` mapping
- `ALLOWED_PROFILE_FIELDS` whitelist

**`src/pages/Auth.tsx`** — On signup, after account creation:
- No UI changes at signup (no phone/LinkedIn fields)
- The duplicate check happens passively: when a resume is uploaded and contact info is extracted, we call `check_duplicate_trial_signup` — if a match is found on a *different* user, we show a warning toast: "It looks like you may already have an account. Please sign in with your original credentials or upgrade."
- The check is informational (warning) rather than blocking, since the contact info comes from a resume and could be shared legitimately

**Wait — re-reading the requirement**: The user said "block any user who tries to sign up as free if the same phone number, email address or linkedin account has been before." This means we need to actually *prevent* duplicate free trials.

**Revised approach for blocking:**
- The `check_duplicate_trial_signup` RPC is called during resume upload after extraction
- If a duplicate is found, we surface a prominent warning but still allow the upload (the account already exists at this point)
- The real gate: modify `handle_new_user()` trigger — when a new user signs up, their profile starts as `pending`. When contact info is later extracted from resume and matches an existing profile, we flag the account
- Better: Add a `trial_blocked` boolean to profiles. When resume contact extraction finds a duplicate phone/linkedin, set `trial_blocked = true` and show an upgrade gate

Actually, the simplest robust approach: since we can't check at signup (we don't have the info yet), we check when resume is uploaded. If duplicates are found, we block trial access by setting the subscription to expired.

### Part 3: Resume Upload Spinner UX

**`src/components/profile/ResumeCard.tsx`**:
- After `uploadResumePdf()` succeeds, show a scanning state: a spinner + "Gathering resume information..." message overlaying the resume list area
- Minimum display time: 2 seconds (use `Promise.all` with a `delay(2000)`)
- During this time, call the new `extract-resume-contact-info` edge function
- On completion: update profile fields, dismiss spinner, show toast with what was found

### Part 4: New Edge Function `extract-resume-contact-info`

**`supabase/functions/extract-resume-contact-info/index.ts`**:
- Input: `{ storagePath }`
- Downloads PDF from storage, sends to Gemini with prompt: "Extract contact information from this resume. Return JSON: { phone, email, linkedin_url }. Return null for any field not found."
- Returns the structured JSON
- Add to `supabase/config.toml`: `[functions.extract-resume-contact-info]` with `verify_jwt = false`

### Part 5: Update Help, Tutorial, QA

**`src/lib/helpEntries.ts`** — Update profile help entry to mention that phone and LinkedIn are auto-extracted from resume upload.

**`src/lib/qaEntries.ts`** — Add QA test case for resume contact extraction: upload PDF → spinner shows for 2+ seconds → phone/LinkedIn fields populated in Identity card.

### Files to Change

| File | Change |
|---|---|
| `src/lib/subscriptionTiers.ts` | Fix free tier limits & features |
| DB migration | Add `phone`, `linkedin_url` to profiles; create `check_duplicate_trial_signup` RPC; partial unique indexes |
| `supabase/functions/extract-resume-contact-info/index.ts` | New edge function |
| `supabase/config.toml` | — auto-configured, no manual edit needed |
| `src/lib/api/profile.ts` | Add phone, linkedin_url to interface + whitelist |
| `src/components/profile/IdentityCard.tsx` | Add phone + LinkedIn fields |
| `src/components/profile/ResumeCard.tsx` | Add post-upload scanning spinner + contact extraction call |
| `src/pages/Profile.tsx` | Wire phone/linkedinUrl state + dirty tracking |
| `src/lib/helpEntries.ts` | Update profile help |
| `src/lib/qaEntries.ts` | Add contact extraction QA test |

