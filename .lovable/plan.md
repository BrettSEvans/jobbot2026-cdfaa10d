

# Add Master Cover Letter Help Entry and Fill Help/Tour Gaps

## Audit Results

Compared all pages, features, and existing help entries. Found these gaps:

| Gap | Type | Fix |
|-----|------|-----|
| Master Cover Letter | No help entry | Add new entry with slug `master-cover-letter`, route `/profile` |
| Auto-Logout (Idle Timeout) | No help entry | Add entry with slug `idle-timeout` (no route — it's global) |
| `resume-health-dashboard` | Missing route field | Add `route: '/applications/:id'` |
| `profile` entry | Outdated summary | Update to mention master cover letter; add `master-cover-letter` to relatedSlugs |
| Tutorial tour | No step for master cover letter on profile | Add tutorial step targeting the cover letter textarea |
| Test file | New slugs missing from regression lists | Add `master-cover-letter` to both SLUGS_REQUIRING_STEPS and SLUGS_REQUIRING_ROUTE; add `resume-health-dashboard` to SLUGS_REQUIRING_ROUTE |

## Changes

### `src/lib/helpEntries.ts`

1. **Add `master-cover-letter` entry** after the `profile` entry:
   - Title: "Master Cover Letter"
   - Summary: explains how it captures user voice, optional but recommended
   - Steps: navigate to profile → paste/write letter → save → AI uses it automatically
   - Tips: mention the nudge system, that it's optional
   - Route: `/profile`
   - Keywords: cover letter, voice, master, template, tone
   - Related: `profile`, `cover-letter-tab`

2. **Add `idle-timeout` entry**:
   - Title: "Auto-Logout (Session Security)"
   - Summary: 30-min inactivity auto-logout, warning at 25 min
   - Steps: interact to stay active, warning toast at 25 min, auto sign-out at 30 min
   - Keywords: idle, timeout, logout, security, session

3. **Update `profile` entry** (line ~154):
   - Add master cover letter mention to summary
   - Add `'master-cover-letter'` to relatedSlugs

4. **Update `resume-health-dashboard` entry** (line ~658):
   - Add `route: '/applications/:id'`

### `src/lib/tutorial/steps.ts`

Add a new tutorial step after `upload-resume` (order 5.5 → use order 6, shift others):
- `id: "master-cover-letter"`
- `helpSlug: "master-cover-letter"`
- `targetSelector: '[data-tutorial="master-cover-letter"]'`
- Title: "Add Your Master Cover Letter"
- Body: explains the voice benefit
- Route: `/profile`, order 6 (bump existing steps 6+ by 1)

### `src/components/profile/CoverLetterCard.tsx`

Add `data-tutorial="master-cover-letter"` attribute to the Textarea for tutorial targeting.

### `src/test/maui/helpEntries.test.ts`

- Add `"master-cover-letter"` to `SLUGS_REQUIRING_STEPS` and `SLUGS_REQUIRING_ROUTE`
- Add `"resume-health-dashboard"` to `SLUGS_REQUIRING_ROUTE`

