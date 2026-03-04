# JobBot Admin Panel — User Guide

> **Last updated:** 2026-03-04  
> **Version:** 1.0  
> **Maintainer:** Update this guide whenever Admin Panel code changes.

---

## 1. Accessing the Admin Panel

1. Log in to JobBot with your admin account.
2. Navigate to **Profile** (top-right avatar → Profile).
3. Click the **"Admin Settings"** button (only visible to users with the `admin` role).
4. You'll land on `/admin`.

**If you don't see the button:** Your account doesn't have the admin role. Another admin must grant it to you.

---

## 2. Current Admin Features

### 2a. Resume Prompt Styles Management

**What it does:** Controls the AI system prompts used to generate tailored resumes for users.

| Action | How |
|--------|-----|
| **View all styles** | Listed in the "Resume Prompt Styles" card, including inactive ones |
| **Create a new style** | Click **"+ Add New Style"** → fill in Label, Slug, Description, System Prompt → Save |
| **Edit a style** | Click the ✏️ (Edit) icon next to any style → modify fields → Save |
| **Delete a style** | Click the 🗑️ (Trash) icon next to any style. **⚠️ This is permanent.** |
| **Deactivate a style** | Edit the style → toggle **Active** off → Save. Users won't see it in the dropdown but it remains in the database. |
| **Reorder styles** | Edit the style → change the **Sort Order** number. Lower numbers appear first in the user dropdown. |

**Fields explained:**

| Field | Required | Description |
|-------|----------|-------------|
| Label | ✅ | Display name shown to users (e.g., "Traditional Corporate") |
| Slug | ✅ | URL-safe identifier (e.g., `traditional-corporate`). Must be unique. |
| Description | ❌ | Short subtitle shown below the label in the user's style dropdown |
| System Prompt | ✅ | The full AI instructions. This is the core prompt that shapes the resume output. |
| Active | — | Toggle visibility to end users. Inactive styles are hidden from the dropdown. |
| Sort Order | — | Integer controlling display order. Default: 0. |

### 2b. Admin User Management

**What it does:** Controls who can access the Admin Panel.

| Action | How |
|--------|-----|
| **View current admins** | Listed in the "Admin Users" card with truncated user IDs |
| **Add a new admin** | Paste the user's UUID into the input field → click **"Add Admin"** |
| **Remove an admin** | Click the 🗑️ icon next to their entry. **You cannot remove yourself.** |

**Finding a user's ID:** Currently, admins must obtain user UUIDs directly (e.g., from the database). Email-based lookup is planned but not yet implemented.

---

## 3. Security Notes

- Admin access is enforced server-side via the `has_role()` PostgreSQL function with `SECURITY DEFINER`. It cannot be bypassed from the client.
- Row-Level Security (RLS) prevents non-admins from modifying `resume_prompt_styles` or `user_roles`.
- The admin check on the frontend (`useAdminRole` hook) is for UI gating only — all actual permission enforcement happens at the database level.

---

## 4. Troubleshooting

| Issue | Solution |
|-------|----------|
| "You don't have admin access" | Your user ID is not in the `user_roles` table with role `admin`. Ask an existing admin to add you. |
| Style not showing for users | Check that `is_active` is `true` and the style was saved successfully. |
| Can't delete a prompt style | Verify you're logged in and have admin role. Check for RLS policy errors in the console. |
| "Add Admin" fails | Ensure the UUID is a valid user ID from the auth system. The user must have signed up first. |

---

## 5. Planned Enhancements (Not Yet Implemented)

The following features have been identified through RedTeam review but are **not yet built**:

### 5a. User Management Dashboard
- **User list with search/filter** — View all registered users, their signup date, last active date, and application count.
- **User detail view** — See a user's profile, application history, and generation usage.
- **Bulk actions** — Select multiple users for batch operations (activate, deactivate, export).
- **Email-based admin lookup** — Add admins by email instead of raw UUID.

### 5b. User Blocking / Unblocking
- **Block user** — Prevent a user from logging in or generating content. Sets a `blocked_at` timestamp.
- **Unblock user** — Restore access. Clears the block flag.
- **Block reason** — Record why a user was blocked (abuse, billing, etc.).
- **Block history** — Audit log of block/unblock actions with timestamps and admin who performed them.

### 5c. Usage Monitoring & Analytics
- **Generation dashboard** — Charts showing daily/weekly generation counts by asset type (resume, cover letter, dashboard, etc.).
- **Per-user usage** — See how many generations a specific user has triggered.
- **Error rate monitoring** — Track `generation_error` frequency and common failure modes.
- **Active user metrics** — DAU/WAU/MAU counts.

### 5d. Content Moderation
- **Flagged content queue** — Review AI-generated content that was flagged by automated filters.
- **Manual content review** — View any user's generated assets (with proper audit logging).

### 5e. System Health
- **Edge function status** — Monitor which functions are deployed and responding.
- **Queue depth** — See how many background jobs are pending.
- **Error log viewer** — Searchable log of recent generation failures.

---

## 6. Proposed AI Agents for Admin Automation

These autonomous or semi-autonomous agents could reduce admin burden significantly:

### Agent 1: **Usage Anomaly Detector**
- **Purpose:** Automatically flag unusual usage patterns (e.g., a user generating 50+ resumes/day, potential abuse).
- **Trigger:** Runs on a schedule (e.g., hourly) via a backend function.
- **Action:** Creates an alert in the admin panel; optionally auto-throttles the user.

### Agent 2: **Content Safety Scanner**
- **Purpose:** Scans generated resumes and cover letters for inappropriate, offensive, or policy-violating content.
- **Trigger:** Runs after each generation completes.
- **Action:** Flags content for admin review; can auto-block output before it reaches the user.

### Agent 3: **Prompt Quality Evaluator**
- **Purpose:** Periodically tests each resume prompt style by running a synthetic generation and scoring the output quality.
- **Trigger:** Scheduled (daily/weekly) or when a prompt style is modified.
- **Action:** Reports quality scores, regressions, and suggestions for prompt improvement to the admin.

### Agent 4: **User Onboarding Assistant**
- **Purpose:** Monitors new user signups and checks if they've completed key onboarding steps (profile filled, first resume generated).
- **Trigger:** Runs after signup and at 24h/72h/7d intervals.
- **Action:** Sends nudge emails or in-app notifications. Reports onboarding funnel metrics to admin.

### Agent 5: **Support Triage Bot**
- **Purpose:** Handles common user issues automatically (e.g., "my generation failed" → checks the error, retries, or explains the issue).
- **Trigger:** User-initiated via a help/support chat widget.
- **Action:** Resolves common issues autonomously; escalates complex ones to admin with full context.

### Agent 6: **Stale Account Cleanup**
- **Purpose:** Identifies accounts with no activity for 90+ days, drafts for cleanup.
- **Trigger:** Weekly scheduled scan.
- **Action:** Generates a report for admin; optionally sends re-engagement emails.

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-03-04 | Initial guide created with current features, planned enhancements, and AI agent proposals | System |
