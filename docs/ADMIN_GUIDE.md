# ResuVibe Admin Panel — User Guide & Enhancement Roadmap
<!-- REBRAND: Replace "ResuVibe" in heading and throughout this document -->

> **Last updated:** 2026-03-04  
> **Version:** 3.0  
> **Maintainer:** Update this guide whenever Admin Panel code changes.

---

## Part I — Current Admin Features

### 1. Accessing the Admin Panel

1. Log in to ResuVibe with your admin account.
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

## Part II — Consolidated Update Plan

### Priority Framework

| Priority | Criteria | Timeline | Risk if Skipped |
|----------|----------|----------|-----------------|
| **P0 — Critical** | Security risk, data loss, or blocks core admin workflow | Sprint 1 (1–2 weeks) | Data loss, abuse, no accountability |
| **P1 — High** | Major usability gap; required for managing >10 users | Sprint 2 (2–4 weeks) | Admin cannot manage users at all |
| **P2 — Medium** | Operational efficiency; nice-to-have for <50 users | Sprint 3 (4–8 weeks) | Manual workarounds, limited insight |
| **P3 — Low** | Scale features; valuable at 100+ users | Backlog | Deferred with no immediate impact |

---

### P0 — Critical Infrastructure (Sprint 1)

These items address **active data-loss risk, abuse vectors, and zero accountability** in the current admin.

#### P0.1 — Destructive Action Confirmations

| Attribute | Detail |
|-----------|--------|
| **Gap** | Delete style and remove admin are single-click, no undo |
| **Risk** | Accidental deletion of production prompt styles wipes generation capability |
| **Solution** | `AlertDialog` with style name / admin ID displayed; type-to-confirm for style deletion (type the slug) |
| **Scope** | `src/pages/Admin.tsx` only — wrap `handleDeleteStyle` and `handleRemoveAdmin` |
| **Effort** | ~2 hours |
| **Dependencies** | None |

#### P0.2 — Rate Limiting Infrastructure

| Attribute | Detail |
|-----------|--------|
| **Gap** | No per-user generation throttle; a single user can exhaust all AI credits |
| **Risk** | Cost blowout, denial of service to other users |
| **DB Changes** | New `generation_usage` table: `id`, `user_id`, `asset_type` (text), `edge_function` (text), `created_at` (timestamptz, default now()) |
| **RLS** | Users can INSERT own rows; admins can SELECT all |
| **Backend** | Each edge function checks count for `user_id` in last hour/day before proceeding; configurable limits stored in `admin_settings` table or hardcoded initially |
| **Admin UI** | "Rate Limits" card on Settings tab showing current limits and top consumers |
| **Effort** | ~1 day |
| **Dependencies** | None |

#### P0.3 — Admin Audit Log

| Attribute | Detail |
|-----------|--------|
| **Gap** | Zero record of who did what — no accountability |
| **Risk** | Cannot investigate incidents, no compliance trail |
| **DB Changes** | New `admin_audit_log` table: `id` (uuid), `admin_id` (uuid), `action` (text — one of: `create_style`, `update_style`, `delete_style`, `restore_style`, `grant_admin`, `revoke_admin`, `block_user`, `unblock_user`, `update_rate_limit`, `export_user_data`), `target_id` (text), `metadata` (jsonb), `created_at` (timestamptz) |
| **RLS** | Admins can INSERT and SELECT; no UPDATE or DELETE (immutable log) |
| **Implementation** | Log in API layer (`adminPrompts.ts`) after each mutation; display last 50 entries in collapsible card |
| **Admin UI** | "Recent Activity" feed on Home tab with action icons, timestamps, and target descriptions |
| **Effort** | ~4 hours |
| **Dependencies** | None |

#### P0.4 — Soft-Delete for Prompt Styles

| Attribute | Detail |
|-----------|--------|
| **Gap** | Deletion is permanent; mirrors the `job_applications` soft-delete pattern already in use |
| **Risk** | Accidental loss of carefully crafted prompt engineering work |
| **DB Changes** | Add `deleted_at timestamptz NULL` to `resume_prompt_styles`; update "Anyone can read active styles" RLS to also exclude `deleted_at IS NOT NULL` |
| **Admin UI** | "Trash" section below active styles; restore button; hard-delete after 30 days |
| **Effort** | ~3 hours |
| **Dependencies** | P0.3 (log restore/delete actions) |

---

### P1 — User Management & Visibility (Sprint 2)

These items transform the admin from a **prompt editor** into a **user management console**.

#### P1.1 — User Directory with Search

| Attribute | Detail |
|-----------|--------|
| **Gap** | Admin has zero visibility into who uses the app, what they do, or when they were last active |
| **Solution** | Edge function `admin-list-users` using service role key |
| **Query** | JOIN `auth.users` (email, created_at, last_sign_in_at) with `profiles` (display_name, first_name, last_name) and aggregate `job_applications` count; support `?search=`, `?page=`, `?per_page=`, `?sort_by=`, `?blocked=` params |
| **Admin UI** | Searchable, sortable table with columns: Name, Email, Signup Date, Last Active, Applications, Status (active/blocked) |
| **Email-based admin lookup** | "Add Admin" input now accepts email → calls edge function to resolve UUID → then inserts role |
| **Effort** | ~1 day |
| **Dependencies** | None |

#### P1.2 — User Block / Unblock System

| Attribute | Detail |
|-----------|--------|
| **Gap** | No way to suspend abusive, fraudulent, or test accounts |
| **Architecture decision** | Separate `blocked_users` table (not profile columns) — cleaner separation, easier audit, no profile schema pollution |
| **DB Changes** | New `blocked_users` table: `id`, `user_id` (unique), `reason` (text), `blocked_by` (uuid), `created_at`; SECURITY DEFINER function `is_blocked(uuid) RETURNS boolean` |
| **RLS enforcement** | Add `AND NOT public.is_blocked(auth.uid())` to all data-mutation policies on `job_applications` and edge function auth checks |
| **Blocked UX** | Blocked users see a clear, non-generic message: "Your account has been suspended. Contact support for details." — not a raw 403 |
| **Admin UI** | Block button on user row → dialog with required reason field → confirm. Unblock button → removes row. Both logged to audit log |
| **Session handling** | Blocking doesn't revoke JWT; block is enforced on next DB/edge request. Document this limitation. |
| **Effort** | ~1 day |
| **Dependencies** | P1.1 (user directory), P0.3 (audit log) |

#### P1.3 — Bulk User Operations

| Attribute | Detail |
|-----------|--------|
| **Gap** | Managing 20+ users one-by-one is untenable |
| **Solution** | Checkbox selection on user table + bulk action bar |
| **Actions** | Block Selected (with shared reason), Unblock Selected, Export Selected |
| **Backend** | Single edge function `admin-bulk-action` accepting `{ action, user_ids[], metadata }` — processes atomically in a transaction |
| **Admin UI** | Floating action bar appears when ≥1 user selected; shows count and action buttons |
| **Effort** | ~4 hours |
| **Dependencies** | P1.1, P1.2 |

#### P1.4 — Admin Dashboard Home Tab

| Attribute | Detail |
|-----------|--------|
| **Gap** | Admin page has no overview; jumps straight into management |
| **Solution** | Summary metrics card as the landing tab |
| **Metrics** | Total users / new this week; Total applications / generated this week; Active prompt styles; Recent errors (last 24h); Blocked users count |
| **Backend** | Edge function `admin-summary` using service role key, returns all metrics in one call |
| **Admin UI** | Grid of metric cards with icons, values, and week-over-week delta badges |
| **Effort** | ~4 hours |
| **Dependencies** | P0.2 (generation_usage for accurate generation counts) |

#### P1.5 — Tabbed Admin Layout

| Attribute | Detail |
|-----------|--------|
| **Gap** | Single scrolling page doesn't scale; Admin.tsx is already 350+ lines |
| **Solution** | Refactor Admin.tsx into tabbed layout with extracted components |
| **Tabs** | Home (P1.4), Users (P1.1-P1.3), Prompts (existing + P0.4), Audit (P0.3), Settings (P0.2 + admin management) |
| **Architecture** | `src/components/admin/AdminHome.tsx`, `AdminUsers.tsx`, `AdminPrompts.tsx`, `AdminAudit.tsx`, `AdminSettings.tsx` |
| **Effort** | ~3 hours (refactor, no new features) |
| **Dependencies** | Should be done first in Sprint 2 to provide structure for all P1 features |

```
┌──────────────────────────────────────────────────┐
│  ← Back   Admin Panel                             │
├──────┬──────────┬─────────┬────────┬──────────────┤
│ Home │  Users   │ Prompts │ Audit  │  Settings    │
├──────┴──────────┴─────────┴────────┴──────────────┤
│                                                    │
│  [Active tab content]                              │
│                                                    │
└──────────────────────────────────────────────────┘
```

---

### P2 — Analytics & Governance (Sprint 3)

#### P2.1 — Usage Analytics Dashboard

| Attribute | Detail |
|-----------|--------|
| **Solution** | Charts (using existing `recharts`) on an Analytics sub-tab |
| **Charts** | Daily generation volume by asset type (line); Top 10 users by generation count (bar); Error rate trend (area); Prompt style popularity (pie) |
| **Data source** | `generation_usage` (P0.2) + `job_applications` |
| **Controls** | Date range picker, asset type filter |
| **Effort** | ~1 day |

#### P2.2 — Role Granularity (Moderator)

| Attribute | Detail |
|-----------|--------|
| **Solution** | Add `'moderator'` to `app_role` enum |
| **Permissions** | Moderators can: view users, view content, block/unblock. Cannot: manage styles, manage admins, change settings |
| **DB Changes** | `ALTER TYPE app_role ADD VALUE 'moderator'`; new RLS policies per capability |
| **Admin UI** | Role dropdown when granting access (admin / moderator) |
| **Effort** | ~4 hours |

#### P2.3 — GDPR/CCPA Data Export

| Attribute | Detail |
|-----------|--------|
| **Solution** | Edge function `admin-export-user-data` → ZIP of JSON files |
| **Contents** | Profile, all applications (with all revision assets), style preferences |
| **Admin UI** | "Export Data" button on user detail; audit-logged |
| **Effort** | ~4 hours |

#### P2.4 — In-App Notification System

| Attribute | Detail |
|-----------|--------|
| **DB Changes** | New `notifications` table: `id`, `user_id`, `type` (text), `title`, `body`, `read_at`, `created_at` |
| **RLS** | Users can SELECT/UPDATE own; admins can INSERT for any user |
| **User UI** | Bell icon in AppHeader; dropdown with unread count |
| **Admin UI** | "Send Notification" to individual user or broadcast |
| **Foundation for** | AI agent alerts (P3), block reason notifications, system announcements |
| **Effort** | ~1 day |

#### P2.5 — Generation Error Queue

| Attribute | Detail |
|-----------|--------|
| **Gap** | Admin cannot see which users are stuck with generation errors |
| **Solution** | Query `job_applications` where `generation_status = 'error'`, grouped by user |
| **Admin UI** | "Stuck Generations" card on Home tab with: user, application, error message, timestamp, "Reset Status" action button |
| **Effort** | ~3 hours |

---

### P3 — AI Agents & Scale (Backlog)

#### P3.1 — Usage Anomaly Detector Agent

| Attribute | Detail |
|-----------|--------|
| **Feasibility** | ✅ No AI calls needed — pure SQL |
| **How** | Scheduled edge function (pg_cron weekly) queries `generation_usage` for outliers (>3σ from user mean) |
| **Output** | Inserts alert row into `notifications` for admins |
| **Cost** | Negligible |

#### P3.2 — Prompt Quality Evaluator Agent

| Attribute | Detail |
|-----------|--------|
| **Feasibility** | ⚠️ 1 AI call per style edit |
| **How** | On prompt style save, queue synthetic test with `gemini-2.5-flash`; score on completeness, formatting, personalization |
| **Output** | Store in `prompt_style_evaluations` table; badge on admin style card |
| **Cost** | Low (~1 call per edit) |

#### P3.3 — Support Triage Bot

| Attribute | Detail |
|-----------|--------|
| **Feasibility** | ⚠️ Requires chat widget |
| **How** | In-app chat → AI diagnoses from error logs + generation history → auto-resolves common issues or escalates |
| **Cost** | 1 AI call per request |

#### P3.4 — Onboarding Monitor

| Attribute | Detail |
|-----------|--------|
| **Feasibility** | ❌ Requires email (not available) |
| **Workaround** | Use P2.4 notification system for in-app nudges instead |

#### P3.5 — Content Safety Scanner

| Attribute | Detail |
|-----------|--------|
| **Feasibility** | ⚠️ Cost-sensitive at scale |
| **How** | Heuristic pre-filter (keyword + length anomaly) → `gemini-2.5-flash-lite` classification → queue for human review |
| **Cost** | Variable; only runs on flagged content |

#### P3.6 — Stale Account Cleanup

| Attribute | Detail |
|-----------|--------|
| **Feasibility** | ✅ Simple SQL |
| **How** | Weekly scheduled function generates report of users with no activity in 90+ days; admin reviews before any action |
| **Cost** | Negligible |

---

## Part III — Database Schema Summary

### New Tables Required

| Table | Priority | Columns | RLS |
|-------|----------|---------|-----|
| `generation_usage` | P0.2 | `id`, `user_id`, `asset_type`, `edge_function`, `created_at` | Users INSERT own; admins SELECT all |
| `admin_audit_log` | P0.3 | `id`, `admin_id`, `action`, `target_id`, `metadata`, `created_at` | Admins INSERT + SELECT; no UPDATE/DELETE |
| `blocked_users` | P1.2 | `id`, `user_id` (unique), `reason`, `blocked_by`, `created_at` | Admins CRUD; `is_blocked()` SECURITY DEFINER |
| `notifications` | P2.4 | `id`, `user_id`, `type`, `title`, `body`, `read_at`, `created_at` | Users read/update own; admins insert any |
| `prompt_style_evaluations` | P3.2 | `id`, `style_id`, `scores` (jsonb), `created_at` | Admins only |

### Schema Modifications

| Table | Priority | Change |
|-------|----------|--------|
| `resume_prompt_styles` | P0.4 | Add `deleted_at timestamptz NULL`; update RLS |
| `app_role` enum | P2.2 | Add `'moderator'` value |

### New Edge Functions

| Function | Priority | Auth | Purpose |
|----------|----------|------|---------|
| `admin-list-users` | P1.1 | Service role + admin check | Paginated user directory |
| `admin-summary` | P1.4 | Service role + admin check | Dashboard metrics |
| `admin-bulk-action` | P1.3 | Service role + admin check | Batch block/unblock/export |
| `admin-export-user-data` | P2.3 | Service role + admin check | GDPR ZIP export |
| `admin-anomaly-scan` | P3.1 | Service role (cron) | Scheduled anomaly detection |
| `admin-evaluate-prompt` | P3.2 | Service role + admin check | AI prompt quality scoring |

### New SECURITY DEFINER Functions

| Function | Priority | Purpose |
|----------|----------|---------|
| `is_blocked(uuid)` | P1.2 | Check if user is blocked; used in RLS policies |

---

## Part IV — Component Architecture

### Current State
- `src/pages/Admin.tsx` — 352 lines, single file, 2 cards

### Target State (after P1.5)

```
src/pages/Admin.tsx                    — Shell with tabs, auth gate
src/components/admin/AdminHome.tsx     — Summary metrics + recent activity
src/components/admin/AdminUsers.tsx    — User directory + block/unblock + bulk
src/components/admin/AdminPrompts.tsx  — Prompt styles CRUD + trash/restore
src/components/admin/AdminAudit.tsx    — Full audit log viewer with filters
src/components/admin/AdminSettings.tsx — Rate limits + role management
src/lib/api/adminPrompts.ts           — Existing API (extended with audit logging)
src/lib/api/adminUsers.ts             — New: user directory, block/unblock, bulk ops
src/lib/api/adminAudit.ts             — New: audit log queries
src/hooks/useAdminRole.ts             — Existing (extended for moderator)
```

---

## Part V — Implementation Order (Recommended)

This sequence minimizes rework and respects dependencies:

```
Sprint 1 (P0):
  1. P0.1 — AlertDialog confirmations        (no deps, immediate safety win)
  2. P0.3 — Audit log table + logging         (foundational for all future actions)
  3. P0.4 — Soft-delete for styles            (logs restore/delete to audit)
  4. P0.2 — Rate limiting table + checks      (independent, parallel track)

Sprint 2 (P1):
  5. P1.5 — Tabbed layout refactor            (structural foundation for all P1 UI)
  6. P1.1 — User directory edge function + UI (unlocks all user management)
  7. P1.4 — Dashboard home tab                (uses generation_usage from P0.2)
  8. P1.2 — Block/unblock system              (requires P1.1 user list)
  9. P1.3 — Bulk operations                   (requires P1.1 + P1.2)

Sprint 3 (P2):
  10. P2.5 — Error queue                      (quick win, no new tables)
  11. P2.1 — Analytics charts                 (uses P0.2 data)
  12. P2.4 — Notification system              (foundation for P3 agents)
  13. P2.2 — Moderator role                   (enum + RLS updates)
  14. P2.3 — GDPR export                      (uses P1.1 user data)

Backlog (P3):
  15. P3.1 — Anomaly detector                 (after P0.2 + P2.4)
  16. P3.6 — Stale account cleanup            (simple, low risk)
  17. P3.2 — Prompt quality evaluator          (after P2.4)
  18. P3.5 — Content safety scanner            (after P2.4)
  19. P3.3 — Support triage bot               (largest effort)
  20. P3.4 — Onboarding monitor               (blocked on email)
```

---

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-03-04 | 1.0 | Initial guide with current features, gaps, and AI agent proposals |
| 2026-03-04 | 2.0 | Critiqued v1.0; added prioritized roadmap (P0–P3); feasibility-assessed AI agents |
| 2026-03-04 | 3.0 | Consolidated all updates into single categorized plan; added dependency graph, component architecture, implementation order, and detailed table/function specs |
