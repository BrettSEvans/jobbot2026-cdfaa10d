## Enhanced Job Search — Filters and Smarter Site Queries

### Problem

1. "Google Jobs" filter searches `careers.google.com` (jobs *at* Google), not Google's job search aggregator (`google.com/search?q=...jobs`)
2. LinkedIn filter returns collection pages, not individual job postings
3. No way to filter by location, remote, job type, etc.

### Changes

**1. Update site filters in `src/lib/api/jobSearch.ts**`

- Rename "Google Careers" → "Jobs Google Found" and change value to use Google's job search aggregator query pattern
- Change LinkedIn value to target individual job posting URLs (`linkedin.com/jobs/view`)
- Add search constraint options: location, remote/on-site/hybrid, job type (full-time, part-time, contract, internship)
- Add new types for `SearchFilters` with `location`, `workMode`, `jobType` fields
- Update `searchJobs()` signature to accept filters and append them to the query string

**2. Update `src/pages/SearchJobs.tsx**`

- Add a collapsible "Filters" row below the search bar with:
  - Location text input (e.g. "San Francisco, CA")
  - Work mode select: Any / Remote / On-site / Hybrid
  - Job type select: Any / Full-time / Part-time / Contract / Internship
- Pass filter values to `searchJobs()` which appends them as query keywords
- Update placeholder text to reflect new capabilities

**3. Update `supabase/functions/search-jobs/index.ts**`

- Accept new `filters` object from request body: `{ location?, workMode?, jobType? }`
- Append filter terms to the Firecrawl search query string (e.g. `"remote" "San Francisco"`)
- For LinkedIn site filter, use `site:linkedin.com/jobs/view` to target individual postings
- For Google Jobs, use `site:google.com/search jobs` or no site filter but prepend "job listing" context

**4. Update tests in `src/test/maui/jobSearch.test.ts**`

- Update Google filter test to check for new value
- Add tests for LinkedIn individual posting filter
- Add tests for filter query building (location, remote, job type appended correctly)

**5. Update QA entries in `src/lib/qaEntries.ts**`

- Add manual test case for location filter
- Add manual test case for remote/work-mode filter

### Files


| File                                      | Action                                                      |
| ----------------------------------------- | ----------------------------------------------------------- |
| `src/lib/api/jobSearch.ts`                | Edit — new filter types, updated site values, query builder |
| `src/pages/SearchJobs.tsx`                | Edit — add filter UI row                                    |
| `supabase/functions/search-jobs/index.ts` | Edit — accept and apply filters                             |
| `src/test/maui/jobSearch.test.ts`         | Edit — update and add filter tests                          |
| `src/lib/qaEntries.ts`                    | Edit — add filter QA cases                                  |
