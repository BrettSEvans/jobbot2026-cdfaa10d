

## Manual QA Testing Suite + Help Registry Gap Fill

### Architecture

Mirror the help registry pattern: a central `ManualTestMeta` type and `qaRegistry` map in `src/lib/qaRegistry.ts`, bulk-registered via `src/lib/qaEntries.ts` (imported once at app startup). A new `/admin` sub-tab "QA Suite" renders the registry as a checklist with pass/fail/skip toggles, time estimates, and filtering by tag/area.

Every QA entry references a `helpSlug` to cross-link with the help system. Every help entry gets a corresponding QA entry, ensuring 1:1 coverage.

### Missing Help Entries to Add

These features exist in the app but have no `registerHelp()` call:

| Feature | Slug |
|---------|------|
| Pricing / Subscription page | `pricing` |
| Password Reset | `reset-password` |
| Import Job (Chrome Extension) | `import-job` |
| ATS Score Scanning | `ats-score` |
| WYSIWYG Editor | `wysiwyg-editor` |
| Upgrade Gate (tier locking) | `upgrade-gate` |
| Onboarding Wizard | `onboarding-wizard` |
| PDF / DOCX Export | `export-downloads` |

### QA Registry Design

```typescript
// src/lib/qaRegistry.ts
export interface ManualTestCase {
  id: string;
  title: string;
  area: string;           // e.g. "Auth", "Applications", "Admin", "Profile"
  route?: string;
  helpSlug?: string;       // cross-link to help entry
  preconditions?: string[];
  steps: string[];
  expectedResults: string[];
  tags: string[];          // e.g. ["smoke", "regression", "mobile", "admin"]
  estimatedMinutes: number;
  requiresAuth: boolean;
  requiresAdmin: boolean;
}
```

### QA Entries (Full Feature Map)

Each entry maps to a testable user flow. Grouped by area:

**Auth & Onboarding** (~25 min)
- Sign up with email
- Sign in with email
- Google SSO login
- Password reset flow
- Pending approval screen
- Onboarding wizard completion

**Applications** (~45 min)
- Create application from URL
- Batch mode (multiple URLs)
- Import job via Chrome Extension deep link
- Application command cards render
- Sort applications
- Soft-delete & restore from trash
- Permanent delete
- Pipeline/Kanban drag-and-drop
- Ghost prompt dialog (48h nudge)
- Background jobs banner

**Application Detail** (~50 min)
- Dashboard tab: view, regenerate, refine via chat
- Cover letter tab: view, refine, download PDF
- Resume tab: view, change style, refine
- Industry assets: propose, generate, swap type
- ATS score: scan, view results
- Revision history: browse, revert
- Save as template
- WYSIWYG inline editing
- Export DOCX

**Profile** (~15 min)
- Edit name, experience, tone
- Add/remove skills and industries
- Upload/rename/delete/star resumes
- Save changes (sticky bar)

**Templates** (~10 min)
- Browse templates
- Apply template to new application
- Delete template

**Admin** (~25 min)
- Approval queue: approve, reject
- Prompt styles: CRUD
- System documents: edit generation guide
- Test users: create, impersonate, switch back
- Rate limits tab
- Audit log tab
- Subscriptions tab

**Cross-cutting** (~10 min)
- Dark/light theme toggle
- Help drawer: open, search, contextual topics
- Interactive tutorial walkthrough
- Upgrade gate (locked features on free tier)
- Mobile responsive: nav drawer, touch targets
- Style preferences card

**Total estimated time: ~3 hours (180 minutes)**

### New Files

| File | Purpose |
|------|---------|
| `src/lib/qaRegistry.ts` | Registry type + map + query functions (mirrors `helpRegistry.ts`) |
| `src/lib/qaEntries.ts` | All test case registrations (~40 entries) |
| `src/components/admin/AdminQATab.tsx` | UI: filterable checklist with pass/fail/skip, area filter, tag filter, time estimate summary |

### Changes to Existing Files

| File | Change |
|------|--------|
| `src/lib/helpEntries.ts` | Add 8 missing `registerHelp()` calls (pricing, reset-password, import-job, ats-score, wysiwyg-editor, upgrade-gate, onboarding-wizard, export-downloads) |
| `src/pages/Admin.tsx` | Add "QA Suite" tab rendering `AdminQATab` |
| `src/App.tsx` | Import `@/lib/qaEntries` at startup |

### AdminQATab UI

- Filter bar: area dropdown, tag multi-select, search
- Summary row: total tests, estimated time for filtered set
- Accordion by area, each test case as a card showing steps, expected results, and pass/fail/skip toggle (local state only, no DB persistence needed initially)
- "Copy as Markdown" button to export the full checklist for external use

