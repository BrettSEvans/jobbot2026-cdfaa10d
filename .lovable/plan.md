

## QA Test Coverage Audit — Gaps Found

### Current State
**48 test cases** across 10 areas. Good coverage of core workflows but significant gaps in public pages, newer features, and several admin tabs.

### Coverage Gaps (19 missing tests)

| # | Missing Test | Area | Why It Matters |
|---|---|---|---|
| 1 | **Landing page renders** | Public Pages | Main entry point for unauthenticated users |
| 2 | **Cookie Policy page** | Public Pages | Legal compliance page, must render |
| 3 | **Privacy Policy page** | Public Pages | Legal compliance page |
| 4 | **Terms of Service page** | Public Pages | Legal compliance page |
| 5 | **404 / Not Found page** | Public Pages | Error UX for bad routes |
| 6 | **Verify Email page** | Auth | Renders correct messaging after signup |
| 7 | **Reset Password page** | Auth | Dedicated page test (current test only covers email sending) |
| 8 | **Campaign auto-approve signup** | Auth | New feature: campaign users skip email verification and admin approval |
| 9 | **Tutorial Demo page** | Cross-cutting | Standalone tutorial demo at /tutorial-demo |
| 10 | **Cookie consent banner** | Cross-cutting | GDPR compliance — accept/decline behavior |
| 11 | **Navigation guard (unsaved changes)** | Cross-cutting | Prompt before leaving with unsaved edits |
| 12 | **Idle session timeout** | Cross-cutting | 30-min timeout warning and auto-logout |
| 13 | **Admin — Roles & Access tab** | Admin | Assign/remove roles via UUID or email lookup |
| 14 | **Admin — Prompt Log tab** | Admin | View prompt history and entries |
| 15 | **Admin — Campaigns tab** | Admin | Create campaigns, view attribution data |
| 16 | **Admin — QA Suite itself** | Admin | Create test runs, record results, export XLSX |
| 17 | **Job description tab** | Application Detail | View/edit scraped job description |
| 18 | **Details tab (edit metadata)** | Application Detail | Edit company name, title, URL inline |
| 19 | **Job search — job type filter** | Job Search | Full-time/part-time/contract/internship filter |

### Stale Test (1 fix)
- `qa-search-jobs-site-filter` still references "Google Careers" — must update to "Jobs Google Found" and fix expected result text

### Implementation

**File: `src/lib/qaEntries.ts`**
- Add 19 new `registerTest()` calls for all gaps above
- Fix the stale site filter test (update title, steps, and expected results)
- Final count: ~67 test cases across ~12 areas

No other files need changes — `AdminQATab` already calls `getAllTests()` from the registry, so all new tests will automatically appear in the QA suite for QA/admin users when they create a test run.

### New Areas to Add
- **Public Pages** — groups the 5 legal/landing/404 tests
- Keep existing areas for the rest (Auth, Application Detail, Admin, Cross-cutting, Job Search)

