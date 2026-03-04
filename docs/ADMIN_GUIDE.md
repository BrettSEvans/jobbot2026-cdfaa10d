# JobBot Admin Panel — User Guide & Enhancement Roadmap

> **Last updated:** 2026-03-04  
> **Version:** 2.0  
> **Maintainer:** Update this guide whenever Admin Panel code changes.

---

## Part I — Current Admin Features

### 1. Accessing the Admin Panel

1. Log in to JobBot with your admin account.
2. Navigate to **Profile** (top-right avatar → Profile).
3. Click **"Admin Settings"** (only visible to users with the `admin` role).
4. You'll land on `/admin`.

**If you don't see the button:** Your account doesn't have the admin role. Another admin must grant it.

---

### 2. Resume Prompt Styles Management

Controls the AI system prompts used to generate tailored resumes.

| Action | How |
|--------|-----|
| **View all styles** | Listed in the "Resume Prompt Styles" card, including inactive ones |
| **Create a new style** | Click **"+ Add New Style"** → fill in Label, Slug, Description, System Prompt → Save |
| **Edit a style** | Click the ✏️ icon → modify fields → Save |
| **Delete a style** | Click 🗑️. **⚠️ Permanent — no undo.** |
| **Deactivate a style** | Edit → toggle **Active** off → Save. Hidden from users but preserved in DB. |
| **Reorder styles** | Edit → change **Sort Order**. Lower = first in dropdown. |

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| Label | ✅ | Display name (e.g., "Traditional Corporate") |
| Slug | ✅ | Unique URL-safe key (e.g., `traditional-corporate`) |
| Description | ❌ | Subtitle shown in the user dropdown |
| System Prompt | ✅ | Full AI instructions shaping resume output |
| Active | — | Visibility toggle for end users |
| Sort Order | — | Integer controlling display order (default: 0) |

---

### 3. Admin User Management

| Action | How |
|--------|-----|
| **View current admins** | Listed with truncated user IDs |
| **Add a new admin** | Paste user UUID → click **"Add Admin"** |
| **Remove an admin** | Click 🗑️. **You cannot remove yourself.** |

**Limitation:** Admin addition requires raw UUIDs. Email-based lookup is not yet available.

---

### 4. Security Architecture

- **Server-side enforcement:** `has_role()` PostgreSQL function (`SECURITY DEFINER`). Cannot be bypassed from client.
- **RLS policies:** Non-admins cannot modify `resume_prompt_styles` or `user_roles`.
- **Frontend gating:** `useAdminRole` hook is UI-only — enforcement is always at the database layer.

---

### 5. Troubleshooting

| Issue | Solution |
|-------|----------|
| "You don't have admin access" | UUID not in `user_roles` with role `admin`. Ask an existing admin. |
| Style not appearing for users | Verify `is_active = true` and save was successful. |
| Can't delete a prompt style | Confirm login + admin role. Check console for RLS errors. |
| "Add Admin" fails | UUID must be a valid, existing auth user. |

---

## Part II — Critique of Original v1.0 Gaps & Recommendations

### What v1.0 Got Right
- Correctly identified the lack of user visibility, block/unblock, and bulk operations as the top gaps.
- AI agent proposals were directionally sound (anomaly detection, content safety, onboarding).
- Security architecture is solid — server-side RLS, `SECURITY DEFINER`, no client-side role trust.

### What v1.0 Missed or Got Wrong

| Issue | Critique |
|-------|----------|
| **No audit trail** | The v1.0 plan mentioned block history but failed to identify that *all* admin actions (style edits, admin grants/revokes) lack audit logging. Best practice: every mutation by an admin should be logged with `admin_id`, `action`, `target`, `timestamp`, and `metadata`. |
| **No confirmation dialogs** | Deleting a prompt style or removing an admin is a single click with no confirmation. This is a data-loss risk. Industry standard: destructive actions require explicit confirmation (type-to-confirm for high-impact). |
| **No soft-delete for styles** | Deletion is permanent. Best practice: soft-delete with `deleted_at` timestamp, matching the pattern already used for `job_applications`. |
| **Block/unblock was under-specified** | v1.0 proposed `blocked_at` on profiles, but didn't address: (a) how RLS would enforce the block during active sessions, (b) whether blocking revokes existing JWT tokens, (c) notification to the user about *why* they were blocked. |
| **Content moderation was vague** | "Flagged content queue" was listed without specifying *what* triggers flags, *who* reviews, or *what actions* are available. Without clear taxonomy (spam, abuse, quality) and resolution states (pending, dismissed, actioned), it's not actionable. |
| **AI agents lacked feasibility assessment** | All 6 agents were proposed without considering: (a) which can be built with existing infrastructure (edge functions + cron), (b) which require external services (email sending, push notifications), (c) cost implications of running AI evaluation on every generation. |
| **No rate limiting** | The biggest operational gap. There's no per-user generation throttle. An abusive user can trigger unlimited edge function calls. This should be P0, not buried in an AI agent proposal. |
| **No data export** | GDPR/CCPA compliance requires data portability. No mention of user data export capability. |
| **Missing role granularity** | The `app_role` enum is `admin | user`. There's no `moderator` or `viewer` role for delegated access (e.g., a support agent who can view but not modify). |
| **No admin dashboard landing** | The admin page jumps straight into management. Best practice: a summary dashboard showing key metrics at a glance before diving into management sections. |

---

## Part III — Prioritized Enhancement Roadmap

### Priority Framework

| Priority | Criteria | Timeline |
|----------|----------|----------|
| **P0 — Critical** | Security risk, data loss risk, or blocks core admin workflow | Sprint 1 (1-2 weeks) |
| **P1 — High** | Major usability gap; required for managing >10 users | Sprint 2 (2-4 weeks) |
| **P2 — Medium** | Operational efficiency; nice-to-have for <50 users | Sprint 3 (4-8 weeks) |
| **P3 — Low** | Scale features; valuable at 100+ users | Backlog |

---

### P0 — Critical (Sprint 1)

#### P0.1 — Destructive Action Confirmations
**Gap:** Delete style and remove admin are single-click with no undo.  
**Change:**
- Add `AlertDialog` confirmation before deleting prompt styles (with style name displayed).
- Add `AlertDialog` before removing admin access (with user ID displayed).
- Consider type-to-confirm for style deletion (type the slug to confirm).

**Scope:** `src/pages/Admin.tsx` — wrap `handleDeleteStyle` and `handleRemoveAdmin` in confirmation dialogs.

#### P0.2 — Rate Limiting Infrastructure
**Gap:** No per-user generation throttle. A single user can exhaust AI credits.  
**Change:**
- Create `generation_usage` table: `user_id`, `asset_type`, `created_at`.
- Insert a row on each generation start (in `backgroundGenerator.ts`).
- Add a check in each edge function: reject if user exceeded daily/hourly limit.
- Admin panel: configurable limits per asset type.

**DB:** New `generation_usage` table + RLS.  
**Backend:** Rate check in edge functions.  
**Admin UI:** Rate limit configuration card.

#### P0.3 — Admin Audit Log
**Gap:** No record of who did what in the admin panel.  
**Change:**
- Create `admin_audit_log` table: `id`, `admin_id`, `action` (enum: `create_style`, `update_style`, `delete_style`, `grant_admin`, `revoke_admin`, `block_user`, `unblock_user`), `target_id`, `metadata` (jsonb), `created_at`.
- Log every admin mutation server-side (via RLS trigger or in the API layer).
- Display recent audit entries in a collapsible section on the admin page.

**DB:** New `admin_audit_log` table.  
**Admin UI:** Audit log viewer card.

#### P0.4 — Soft-Delete for Prompt Styles  
**Gap:** Deletion is permanent and irreversible.  
**Change:**
- Add `deleted_at timestamptz NULL` to `resume_prompt_styles`.
- Update RLS: exclude soft-deleted rows from user SELECT.
- Admin can see deleted styles in a "Trash" section and restore them.
- Hard delete only after 30 days or explicit "purge."

**DB:** Migration to add column + update RLS.  
**Admin UI:** Trash/restore UI.

---

### P1 — High (Sprint 2)

#### P1.1 — User Directory with Search
**Gap:** Admin has zero visibility into who uses the app.  
**Change:**
- Create an admin-only edge function `admin-list-users` that queries `profiles` joined with `job_applications` count, with search/filter/pagination.
- New "Users" card on admin page with:
  - Searchable table (name, email fragment, signup date, app count, last active).
  - Click-through to user detail (profile + application list).
- Email-based admin lookup: the "Add Admin" input accepts email → calls the edge function to resolve UUID.

**Backend:** `admin-list-users` edge function (uses service role key).  
**Admin UI:** Users table with search, pagination, detail drawer.

#### P1.2 — User Block / Unblock System
**Gap:** No way to suspend abusive or problematic users.  
**Change:**
- Add to `profiles`: `blocked_at timestamptz NULL`, `blocked_reason text NULL`, `blocked_by uuid NULL`.
- Update all data-access RLS policies to include `AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND blocked_at IS NOT NULL)`.
- Alternatively: use a `blocked_users` table checked via a `SECURITY DEFINER` function `is_blocked(uuid)` for cleaner separation.
- Admin UI: Block button on user row → dialog with reason field → sets block.  
- Admin UI: Unblock button → clears block fields.
- Blocked user experience: on next request, receives a clear error message explaining the block (not a generic 403).

**DB:** `blocked_users` table or profile columns + RLS updates.  
**Admin UI:** Block/unblock actions on user rows.  
**Frontend:** Blocked-user error handling in API layer.

#### P1.3 — Bulk User Operations
**Gap:** All admin actions are one-at-a-time.  
**Change:**
- Add checkbox selection to the Users table.
- Bulk actions dropdown: Block Selected, Unblock Selected, Export Selected.
- Server-side batch processing via edge function (not N individual requests).

**Admin UI:** Selection state + bulk action bar.  
**Backend:** Batch edge function endpoint.

#### P1.4 — Admin Dashboard Summary
**Gap:** Admin page has no overview — you must drill into each section.  
**Change:**
- Add a summary card at the top of `/admin` showing:
  - Total users / new this week
  - Total applications / generated this week
  - Active prompt styles count
  - Recent errors count (last 24h)
  - Any blocked users count
- Data fetched via a single admin-summary edge function.

**Backend:** `admin-summary` edge function.  
**Admin UI:** Summary card with key metrics.

---

### P2 — Medium (Sprint 3)

#### P2.1 — Usage Analytics Dashboard
**Change:**
- Charts (using existing `recharts` dependency) showing:
  - Daily generation volume by asset type (line chart).
  - Top 10 users by generation count (bar chart).
  - Error rate trend (area chart).
  - Prompt style popularity (pie chart).
- Data sourced from `generation_usage` table (from P0.2) + `job_applications`.
- Date range picker for filtering.

**Admin UI:** New "Analytics" tab/section with charts.

#### P2.2 — Role Granularity (Moderator Role)
**Change:**
- Add `'moderator'` to `app_role` enum.
- Moderators can: view users, view generated content, block/unblock users.
- Moderators cannot: manage prompt styles, manage other admins.
- Update `has_role()` and RLS policies accordingly.

**DB:** Enum update + RLS policy updates.  
**Admin UI:** Role selector when granting access.

#### P2.3 — Data Export (GDPR/CCPA)
**Change:**
- Admin can trigger a full data export for any user (profile + all applications + all generated assets).
- Export as ZIP containing JSON files.
- Audit-logged.

**Backend:** `admin-export-user-data` edge function.  
**Admin UI:** "Export Data" button on user detail view.

#### P2.4 — Notification System Foundation
**Change:**
- Create `notifications` table: `id`, `user_id`, `type`, `title`, `body`, `read_at`, `created_at`.
- In-app notification bell for users.
- Admin can send notifications to individual users or broadcast to all.
- Foundation for AI agent notifications (P3).

**DB:** `notifications` table + RLS.  
**UI:** Notification bell component + admin send UI.

---

### P3 — Low / Backlog (Future)

#### P3.1 — AI Agent: Usage Anomaly Detector
**Feasibility:** ✅ Buildable with existing infra.  
- Scheduled edge function (use `pg_cron` or external cron hitting the function).
- Queries `generation_usage` for outliers (>3σ from mean daily usage).
- Inserts alert into `admin_notifications` table.
- Admin sees alerts on dashboard (P1.4).

**Cost:** Minimal (SQL query, no AI calls).

#### P3.2 — AI Agent: Prompt Quality Evaluator
**Feasibility:** ⚠️ Requires AI calls = cost per evaluation.  
- On prompt style save, queue a synthetic test generation.
- Use Lovable AI (`gemini-2.5-flash`) to score output on: completeness, formatting, personalization, length.
- Store scores in `prompt_style_evaluations` table.
- Show score badge next to each style in admin.

**Cost:** ~1 AI call per style edit. Acceptable.

#### P3.3 — AI Agent: Support Triage Bot
**Feasibility:** ⚠️ Requires chat widget infrastructure.  
- In-app chat widget for users to report issues.
- AI agent (via Lovable AI) attempts to diagnose from error logs + generation history.
- Auto-resolves common issues (retry failed generation, explain rate limit).
- Escalates to admin with full context packet.

**Cost:** 1 AI call per support request. Moderate at scale.

#### P3.4 — AI Agent: Onboarding Monitor
**Feasibility:** ❌ Requires email sending capability (not currently available).  
- Defer until email integration is added.
- In-app nudge notifications (via P2.4) could substitute.

#### P3.5 — AI Agent: Content Safety Scanner
**Feasibility:** ⚠️ High cost if run on every generation.  
- Better approach: run only when flagged by heuristic rules (keyword lists, length anomalies).
- Use `gemini-2.5-flash-lite` for classification (cheapest model).
- Queue for human review rather than auto-blocking (reduce false positives).

#### P3.6 — AI Agent: Stale Account Cleanup
**Feasibility:** ✅ Simple SQL query.  
- Weekly scheduled function.
- Generates report (not auto-deletes).
- Admin reviews and decides.

**Cost:** Minimal.

---

## Part IV — Implementation Architecture Notes

### Database Tables Needed (cumulative)

| Table | Priority | Purpose |
|-------|----------|---------|
| `generation_usage` | P0 | Rate limiting + analytics source |
| `admin_audit_log` | P0 | Audit trail for all admin actions |
| `blocked_users` | P1 | User block/unblock with reason + history |
| `notifications` | P2 | In-app notification system |
| `prompt_style_evaluations` | P3 | AI quality scores for prompt styles |

### Edge Functions Needed (cumulative)

| Function | Priority | Purpose |
|----------|----------|---------|
| `admin-list-users` | P1 | Paginated user directory with search |
| `admin-summary` | P1 | Dashboard metrics aggregation |
| `admin-export-user-data` | P2 | GDPR data export |
| `admin-anomaly-scan` | P3 | Scheduled usage anomaly detection |
| `admin-evaluate-prompt` | P3 | AI-powered prompt quality scoring |

### Admin Page UI Architecture

Current: Single scrollable page with 2 cards.  
Proposed: Tabbed layout within `/admin`:

```
┌──────────────────────────────────────────────────┐
│  Admin Panel                                      │
├──────┬──────────┬─────────┬──────────┬───────────┤
│ Home │  Users   │ Prompts │ Analytics│  Settings │
├──────┴──────────┴─────────┴──────────┴───────────┤
│                                                    │
│  [Tab content area]                                │
│                                                    │
└──────────────────────────────────────────────────┘
```

- **Home:** Summary metrics (P1.4) + recent audit log (P0.3) + active alerts (P3.1)
- **Users:** User directory (P1.1) + block/unblock (P1.2) + bulk actions (P1.3)
- **Prompts:** Current styles management (existing) + quality scores (P3.2)
- **Analytics:** Usage charts (P2.1)
- **Settings:** Rate limits (P0.2) + role management (existing + P2.2) + notification broadcast (P2.4)

---

## Changelog

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-04 | 1.0 | Initial guide with current features, gaps, and AI agent proposals | System |
| 2026-03-04 | 2.0 | Complete rewrite: critiqued v1.0 gaps, added prioritized roadmap (P0–P3), feasibility-assessed AI agents, defined DB/edge function architecture | System |
