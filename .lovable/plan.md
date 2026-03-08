

## Critical UX Analysis & Role-Based Access Control Plan

### UX Problems Identified

**1. Tab bar is broken at 9 tabs across**
The `grid-cols-9` TabsList is the most critical failure. On anything narrower than ~1200px, the tab labels compress into unreadable slivers. Even on full desktop, 9 equally-spaced triggers with icons + text is visually overwhelming. This is the single biggest usability problem -- the primary navigation for the entire admin experience is unusable on most screens.

**2. No information hierarchy**
All 9 tabs are presented as equally important. But "Approvals" (daily operational task) and "Guide" (reference doc read once) are given identical visual weight. There's no grouping or categorization -- the user has to scan 9 items to find what they need.

**3. Admin page is a monolith**
The `Admin.tsx` file is 638 lines with inline Prompts tab content, Users tab content, and 4 dialog definitions all living in the page component. The Prompts and Users tabs should be extracted like the other tabs were.

**4. No link to Admin from main nav**
Admins/QA users currently have to navigate to `/admin` manually or know the URL. There's no nav entry in AppHeader for users with elevated roles.

**5. "Users" tab only manages admin roles via raw UUID**
Adding an admin requires pasting a UUID. There's no user search, no email lookup, no role selection UI. The tab title says "Users" but it only manages admin role assignments.

**6. QA tab accessible only to admins**
QA testers need admin access just to run tests -- granting them full admin powers (delete users, change subscriptions, modify prompts) is a security and operational risk.

### Proposed Solution

#### A. Add `qa` role to the enum and update RBAC

**Database migration:**
- Add `'qa'` to the `app_role` enum
- Create a new `has_any_role()` security definer function for checking multiple roles
- Update `qa_test_runs` and `qa_test_results` RLS policies to allow both `admin` and `qa` roles

**Hook changes (`useAdminRole.ts` → `useUserRoles.ts`):**
- Fetch ALL roles for the current user (not just admin)
- Return `{ roles: string[], isAdmin: boolean, isQA: boolean, hasAnyRole: boolean, loading }`
- `isAdmin` = has admin role
- `isQA` = has qa role (may or may not also have admin)
- `hasAnyRole` = has admin OR qa (gates access to `/admin` route)

#### B. Restructure the Admin Panel navigation

Replace the 9-tab horizontal bar with a **sidebar navigation** pattern (on desktop) or a **dropdown/select** (on mobile):

```text
┌─────────────────────────────────────────────────┐
│ ← Back    Admin Panel    Build: v2.4            │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ OPERATIONS │  [Active Section Content]          │
│ ○ Approvals│                                    │
│ ○ Subs     │                                    │
│            │                                    │
│ AI CONFIG  │                                    │
│ ○ Prompts  │                                    │
│ ○ Gen Guide│                                    │
│            │                                    │
│ ACCESS     │                                    │
│ ○ Users    │                                    │
│ ○ Limits   │                                    │
│            │                                    │
│ MONITORING │                                    │
│ ○ Audit    │                                    │
│ ○ QA       │                                    │
│            │                                    │
│ REFERENCE  │                                    │
│ ○ Guide    │                                    │
└──────────┴──────────────────────────────────────┘
```

- Sidebar groups provide information hierarchy
- Items gated by role: QA-only users see only the QA section; admin+QA users see everything
- On mobile (<768px), sidebar collapses to a Select dropdown at the top
- Max width bumps from `max-w-3xl` to `max-w-5xl` to accommodate sidebar

#### C. Role management UI upgrade (Users tab → Roles tab)

- Rename "Users" to "Roles & Access"
- Show each user with their assigned roles as toggleable badges (admin, qa)
- Admins can toggle roles on/off per user
- Show user email alongside UUID (from profiles table join, since admins can read all profiles)
- Add email search to find users instead of requiring raw UUIDs
- QA-only users cannot see this tab

#### D. AppHeader admin link

- If user has any role (admin or qa), show a shield icon link to `/admin` in the main nav
- Keeps the nav clean for regular users

### File Changes

| File | Change |
|------|--------|
| `supabase/migrations/` | Add `qa` to `app_role` enum; create `has_any_role()` function; update QA table RLS to include qa role |
| `src/hooks/useAdminRole.ts` → `src/hooks/useUserRoles.ts` | Fetch all roles, expose `isAdmin`, `isQA`, `hasAnyRole` |
| `src/pages/Admin.tsx` | Replace tabs with sidebar layout; gate sections by role; extract Prompts/Users inline content to components; widen max-width |
| `src/components/admin/AdminRolesTab.tsx` | New component: role management with email search, multi-role toggles |
| `src/components/admin/AdminSidebar.tsx` | New component: grouped sidebar nav with role-based visibility |
| `src/components/AppHeader.tsx` | Add conditional Admin link for users with any role |
| `src/lib/api/adminPrompts.ts` | Update `getAdminUsers` to fetch all roles (not just admin); add role toggle functions |
| `docs/PROMPT_LOG.md` | Log this prompt |

### Role Access Matrix

```text
Section          │ admin │ qa  │ admin+qa
─────────────────┼───────┼─────┼─────────
Approvals        │  ✓    │  ✗  │  ✓
Prompts          │  ✓    │  ✗  │  ✓
Gen Guide        │  ✓    │  ✗  │  ✓
Roles & Access   │  ✓    │  ✗  │  ✓
Subscriptions    │  ✓    │  ✗  │  ✓
Rate Limits      │  ✓    │  ✗  │  ✓
Audit Log        │  ✓    │  ✗  │  ✓
Guide            │  ✓    │  ✗  │  ✓
QA               │  ✗    │  ✓  │  ✓
```

### Security Notes
- QA role RLS uses the same `has_role()` pattern -- no client-side gating only
- The `qa` value is added to the Postgres enum, so the `user_roles` table enforces valid values
- QA users cannot see or modify any admin-only tables (prompt styles, audit log, etc.) -- RLS unchanged on those
- Only admins can assign/remove roles (including QA)

