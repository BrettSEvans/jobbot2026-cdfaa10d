

## Plan: Merge Two Accounts (Shared Data Access)

### Goal
Make `stickyevans@gmail.com` see all of `brettevanssf@gmail.com`'s data (applications, resumes, materials) as if they were their own. Both accounts remain independent auth users. `brettevanssf` keeps admin role; `stickyevans` gets no special roles.

### Approach

Create an `account_links` table and a security-definer helper function, then update RLS policies on all user-data tables so linked accounts share visibility.

```text
account_links
┌─────────────────────┬──────────────────────┐
│ primary_user_id     │ linked_user_id       │
│ (brettevanssf)      │ (stickyevans)        │
└─────────────────────┴──────────────────────┘

is_linked_or_self(owner_id) → true if:
  owner_id = auth.uid()  OR
  EXISTS link where primary=owner_id AND linked=auth.uid()  OR
  EXISTS link where primary=auth.uid() AND linked=owner_id
```

### Steps

**1. Database migration**
- Create `account_links` table (`primary_user_id uuid, linked_user_id uuid, created_at`)
- Create `is_linked_or_self(uuid)` security-definer function
- Update RLS on these tables to use `is_linked_or_self(user_id)` instead of `user_id = auth.uid()`:
  - `job_applications` (4 policies)
  - `user_resumes`
  - `pipeline_stage_history`
  - `user_style_preferences`
  - `generation_usage`
- The `owns_application` function also needs updating so child tables (revisions, generated_assets, proposed_assets) automatically inherit access

**2. Data operations (insert tool)**
- Look up both user IDs from `profiles` by email
- Insert a row into `account_links` linking them
- Copy profile fields (first_name, last_name, resume_text, key_skills, etc.) from brettevanssf to stickyevans
- Ensure stickyevans has role `customer` only (no admin)

**3. Update `owns_application` function**
- Change from `user_id = auth.uid()` to `is_linked_or_self(user_id)` so all revision tables, generated_assets, and proposed_assets automatically share access without touching each table's RLS individually

### Tables affected by RLS changes
| Table | Current check | New check |
|-------|--------------|-----------|
| `job_applications` | `user_id = auth.uid()` | `is_linked_or_self(user_id)` |
| `user_resumes` | `user_id = auth.uid()` | `is_linked_or_self(user_id)` |
| `pipeline_stage_history` | `user_id = auth.uid()` | `is_linked_or_self(user_id)` |
| `user_style_preferences` | `user_id = auth.uid()` | `is_linked_or_self(user_id)` |
| `generation_usage` | `user_id = auth.uid()` | `is_linked_or_self(user_id)` |
| `owns_application()` | `user_id = auth.uid()` | `is_linked_or_self(user_id)` |

Child tables using `owns_application()` (all revisions, generated_assets, proposed_assets) get access automatically.

### No code changes needed
All RLS is database-level. The app code already uses `auth.uid()` which flows through the updated RLS functions. No React/TypeScript changes required.

### Security
- `account_links` gets admin-only RLS (only admins can create/manage links)
- `is_linked_or_self` is security-definer to avoid recursive RLS
- stickyevans gets read AND write access to shared data (so you can use it as a working account)

