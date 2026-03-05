# Custom AI Resume Generation — Product Spec & System Architecture

## 1. Feature Overview

Add AI-generated, job-tailored resumes to JobBot. Users select a resume style during job creation; the system combines their baseline resume, the job description, and company research to produce a customized resume. An admin panel allows prompt management.

---

## 2. User Flow: Job Creation → Resume

1. User clicks **"New Application"** → enters Job URL → system scrapes job description & company info (existing flow).
2. **NEW**: A "Resume Style" dropdown appears in the creation form, populated from `resume_prompt_styles` table. Default: "Traditional Corporate".
3. User clicks **"Create"** → background generation kicks off (existing `backgroundGenerator.ts` pattern).
4. The generation pipeline now includes a **resume generation step** after the cover letter step:
   - Fetch user's `resume_text` from `profiles`
   - Fetch selected `resume_prompt_styles` row (system prompt + style instructions)
   - Fetch company research data (competitors, products, customers, branding)
   - Call new Edge Function `generate-resume` with all inputs
   - Store result in `job_applications.resume_html`
5. User lands on Application Detail → **Resume tab** appears alongside Dashboard and Cover Letter in the primary tabs bar.
6. Resume tab uses the existing `HtmlAssetTab` component with actions: Download PDF, Copy Text, Refine with AI, Save as Template.

---

## 3. Data Model Updates

### New Tables

#### `resume_prompt_styles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `label` | text NOT NULL | Display name (e.g., "Traditional Corporate") |
| `slug` | text NOT NULL UNIQUE | URL-safe key (e.g., "traditional-corporate") |
| `system_prompt` | text NOT NULL | The full system prompt for the AI |
| `description` | text | Short description shown to users in the dropdown |
| `is_active` | boolean DEFAULT true | Soft-disable without deleting |
| `sort_order` | integer DEFAULT 0 | Controls display order |
| `created_by` | uuid | FK-free reference to admin who created it |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

**RLS**: 
- SELECT: `is_active = true` for all authenticated users (they need to see the dropdown)
- INSERT/UPDATE/DELETE: Only users with admin role

#### `resume_revisions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `application_id` | uuid NOT NULL | FK → job_applications |
| `html` | text NOT NULL | |
| `label` | text | |
| `revision_number` | integer DEFAULT 1 | |
| `created_at` | timestamptz DEFAULT now() | |

**RLS**: Same pattern as other revision tables (user owns parent application).

#### `user_roles` (for admin access)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL UNIQUE | References auth.users(id) ON DELETE CASCADE |
| `role` | app_role NOT NULL | Enum: 'admin', 'user' |

**RLS**: 
- SELECT own role: `user_id = auth.uid()`
- INSERT/UPDATE/DELETE: Only existing admins via `has_role()` security definer function

### Modified Tables

#### `job_applications` — add columns:
| Column | Type | Notes |
|--------|------|-------|
| `resume_html` | text NULL | Generated resume HTML |
| `resume_style_id` | uuid NULL | FK-free reference to selected prompt style |

---

## 4. Admin Role System

### Bootstrap
- Seed `user_roles` with `brettevanssf@gmail.com`'s user ID as `admin` role.
- Create `has_role(uuid, app_role)` security definer function (per project guidelines).

### Admin Assignment Flow
1. Admin navigates to Profile page → sees "Admin Settings" button (conditionally rendered).
2. Admin Panel has a "User Management" section listing current admins.
3. Admin can add new admins by entering an email → system looks up user ID → inserts into `user_roles`.
4. Admin can remove other admins (but not themselves).

---

## 5. API / Backend Architecture

### New Edge Function: `generate-resume`
**Input:**
```json
{
  "jobDescription": "...",
  "resumeText": "...",
  "systemPrompt": "...",
  "companyName": "...",
  "jobTitle": "...",
  "branding": {...},
  "competitors": [...],
  "customers": [...],
  "products": [...]
}
```
**Behavior:** SSE streaming (same pattern as `generate-dashboard`, `tailor-cover-letter`). Returns styled HTML resume.

### New Edge Function: `refine-resume`
Same pattern as `refine-dashboard` — accepts current HTML + user message + chat history, returns refined HTML via SSE.

### Client-Side API Layer
- `src/lib/api/resume.ts` — `streamResumeGeneration()`, mirrors `streamDashboardGeneration()`
- `src/lib/api/resumeRevisions.ts` — Revision CRUD via factory
- `src/lib/api/adminPrompts.ts` — CRUD for resume_prompt_styles

### Background Generator Update
- `src/lib/backgroundGenerator.ts` — add resume generation step after cover letter, using the selected style's prompt.

---

## 6. UI/UX Architecture

### 6a. Job Creation Flow (`NewApplication.tsx`)

**Addition:** Below the Job URL input, add:
```
Resume Style: [▾ Traditional Corporate]
```
- Dropdown fetches from `resume_prompt_styles` where `is_active = true`, ordered by `sort_order`.
- Each option shows `label` + `description` as a subtitle.
- Selection stored and passed to background generator.

### 6b. Application Detail View (`ApplicationDetail.tsx`)

**Primary tabs bar update:**
Currently: `Dashboard | Cover Letter`
New: `Dashboard | Cover Letter | Resume`

The Resume tab uses the existing `HtmlAssetTab` component with:
- `assetType: "resume"`
- `dbField: "resume_html"`
- `generateFn: streamResumeGeneration`
- `saveRevisionFn: saveResumeRevision`
- Actions: Download PDF, Copy Text, Refine with AI, Save as Template

### 6c. Admin Panel (`/admin` route or modal from Profile)

**Access:** Profile page shows "Admin Settings" button only when `has_role(auth.uid(), 'admin')` returns true.

**Admin Page Layout:**
```
┌─────────────────────────────────────────┐
│  Admin Panel                            │
├─────────────────────────────────────────┤
│                                         │
│  📝 Resume Prompt Styles                │
│  ┌───────────────────────────────────┐  │
│  │ Traditional Corporate    [Edit]   │  │
│  │ Tech Engineering         [Edit]   │  │
│  │ Career Changer           [Edit]   │  │
│  │ Creative/Design          [Edit]   │  │
│  │ Executive Leadership     [Edit]   │  │
│  └───────────────────────────────────┘  │
│  [+ Add New Style]                      │
│                                         │
│  👥 User Management                     │
│  ┌───────────────────────────────────┐  │
│  │ brett@... (you)          [Owner]  │  │
│  │ other@...                [Remove] │  │
│  └───────────────────────────────────┘  │
│  [+ Add Admin]                          │
│                                         │
└─────────────────────────────────────────┘
```

**Edit Prompt Modal:**
- Label (text input)
- Description (text input, shown in user dropdown)
- System Prompt (large textarea, the actual AI instructions)
- Active toggle
- Sort order (number input)
- Save / Cancel

---

## 7. File Checklist

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/generate-resume/index.ts` | SSE streaming resume generation |
| `supabase/functions/refine-resume/index.ts` | SSE streaming resume refinement |
| `src/lib/api/resume.ts` | Client API for resume generation/refinement |
| `src/lib/api/resumeRevisions.ts` | Revision CRUD via factory |
| `src/lib/api/adminPrompts.ts` | CRUD for resume_prompt_styles |
| `src/pages/Admin.tsx` | Admin panel page |
| `src/hooks/useAdminRole.ts` | Hook to check admin status via `has_role()` |

### Modified Files
| File | Change |
|------|--------|
| `src/pages/ApplicationDetail.tsx` | Add Resume to primary tabs |
| `src/pages/NewApplication.tsx` | Add style dropdown to creation form |
| `src/pages/Profile.tsx` | Add Admin Panel link (conditional) |
| `src/lib/backgroundGenerator.ts` | Add resume generation step |
| `src/lib/api/refineAsset.ts` | Add `"resume"` to `RefinableAssetType` |
| `src/hooks/useApplicationDetail.ts` | Add `resumeHtml` / `setResumeHtml` state |
| `src/App.tsx` | Add `/admin` route (protected) |

### Database Migrations
1. Create `app_role` enum + `user_roles` table + `has_role()` function
2. Create `resume_prompt_styles` table with RLS
3. Create `resume_revisions` table with RLS
4. Add `resume_html` and `resume_style_id` columns to `job_applications`
5. Seed initial 5 prompt styles
6. Seed initial admin user

---

## 8. Security Considerations

- **Admin access**: Server-side only via `has_role()` security definer function. Never checked client-side via localStorage.
- **RLS on prompt styles**: All authenticated users can SELECT active styles. Only admins can INSERT/UPDATE/DELETE.
- **RLS on user_roles**: Users can read their own role. Only admins can manage roles.
- **Resume content**: Same RLS as other assets — user owns parent job_application.

---

## 9. Generation Pipeline (Updated)

```
User clicks Create
  → scrape-job (existing)
  → scrape-company-branding (existing)
  → analyze-company (existing)
  → research-company (existing)
  → generate-dashboard (existing)
  → tailor-cover-letter (existing)
  → generate-resume (NEW) ← uses selected style prompt + resume_text + JD + research
```

All steps run sequentially in `backgroundGenerator.ts`. Resume is the final step.

---

## 10. Initial Prompt Styles (Seed Data)

| Label | Slug | Description |
|-------|------|-------------|
| Traditional Corporate | `traditional-corporate` | Clean, formal format suited for corporate and financial roles |
| Tech Engineering | `tech-engineering` | Skills-forward layout emphasizing technical projects and stack |
| Career Changer | `career-changer` | Highlights transferable skills and reframes prior experience |
| Creative & Design | `creative-design` | Visually distinctive layout for creative and marketing roles |
| Executive Leadership | `executive-leadership` | Achievement-focused format for senior and C-level positions |
