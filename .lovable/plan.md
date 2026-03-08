

## QA Test Runs & Regression Tracking

### Overview
Transform the current in-memory QA checklist into a persistent test run system with build tracking, failure notes, and regression fix workflows.

### Database Changes

**New table: `qa_test_runs`**
- `id` (uuid, PK)
- `build_label` (text) -- e.g. "v2.4 - 2026-03-08 14:32"
- `build_timestamp` (timestamptz) -- matches Lovable history timestamp
- `notes` (text, nullable)
- `created_by` (uuid) -- admin who created the run
- `created_at` (timestamptz)
- `status` (text) -- "in_progress", "completed"
- RLS: admin-only via `has_role()`

**New table: `qa_test_results`**
- `id` (uuid, PK)
- `run_id` (uuid, FK -> qa_test_runs)
- `test_case_id` (text) -- matches registry ID like "qa-signup-email"
- `result` (text) -- "pass", "fail", "skip"
- `failure_notes` (text, nullable) -- tester's description when fail
- `regression_ticket` (text, nullable) -- free-text reference for fix tracking
- `regression_fixed_at` (timestamptz, nullable)
- `tested_by` (uuid)
- `created_at` (timestamptz)
- RLS: admin-only via `has_role()`

### UI Changes

**1. Test Run Management (top of AdminQATab)**
- "New Test Run" button opens a dialog to set build label (free text) and build timestamp (date-time picker)
- Dropdown to select/switch between existing test runs
- Active run's build label + timestamp displayed prominently
- Run status badge (in progress / completed) with a "Mark Complete" button
- Build version shown in the Admin Panel header area

**2. Failure Notes (per test case)**
- When a test is marked "Fail", a textarea auto-expands below the test card
- Tester types a description of what went wrong
- Notes persist to `qa_test_results` on blur/change

**3. Build Version Display**
- Show the active test run's build label in the Admin Panel header (next to "Admin Panel" title)
- Format: `Build: v2.4 - Mar 8, 2026 14:32`

**4. "Fix Regression" Actions**
- **Per test**: A wrench/bug icon button appears on failed tests. Clicking it opens an alert dialog confirming "Mark this regression as fixed?" -- sets `regression_fixed_at` timestamp and toggles visual state (strikethrough on failure note, green "Fixed" badge)
- **Per run**: A "Fix All Regressions" button in the run header marks all failed tests in the run as fixed in one batch update
- Fixed regressions stay visible but visually distinguished from open failures

**5. Run History**
- A collapsible "Previous Runs" section below the active run
- Shows past runs with summary stats (X pass, Y fail, Z skip)
- Click to view read-only results of that run

### File Changes

| File | Change |
|------|--------|
| `supabase/migrations/` | New migration for `qa_test_runs` + `qa_test_results` tables with admin RLS |
| `src/components/admin/AdminQATab.tsx` | Major rewrite: add run selector, failure textarea, fix-regression buttons, build label display |
| `src/pages/Admin.tsx` | Show build version badge in header from active test run |
| `docs/PROMPT_LOG.md` | Log this prompt |

### Technical Notes
- Test case IDs from `qaRegistry.ts` serve as the join key between the static registry and persisted results
- The build timestamp is manually entered by the admin to match the Lovable version history timestamp (there's no API to auto-fetch it)
- All data is admin-only via `has_role()` RLS policies
- The "Fix Regression" action is a metadata update, not a code fix -- it records that the regression has been addressed in a subsequent build

