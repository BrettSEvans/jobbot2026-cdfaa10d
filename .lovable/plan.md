

## Search Jobs Feature

### Overview
Add a "Search Jobs" page where users can search for job listings across career sites using Firecrawl's search API, view results in a clean card layout, and import any result directly into their application pipeline with one click.

### Architecture

```text
User → /search-jobs → SearchJobs page
  ├── Search bar (query + optional site filter)
  ├── Calls supabase.functions.invoke('search-jobs')
  │     └── Uses Firecrawl search API with scrapeOptions
  ├── Results displayed as cards (title, company, snippet, URL)
  └── "Import" button per result
        └── Calls saveJobApplication() → navigates to /applications/:id
```

### Changes

**1. New edge function: `supabase/functions/search-jobs/index.ts`**
- Accepts `{ query, site?, limit? }` — auth required
- Calls Firecrawl search API: `query` = user query (prepends `site:careers.google.com` etc. if site filter provided)
- Uses `scrapeOptions: { formats: ['markdown'] }` to get content from top results
- Returns array of `{ url, title, description, markdown }` results

**2. New API client: `src/lib/api/jobSearch.ts`**
- `searchJobs(query, site?, limit?)` — invokes the edge function
- Types: `JobSearchResult { url, title, description, markdown }`

**3. New page: `src/pages/SearchJobs.tsx`**
- Search bar with text input + optional site dropdown (All Sites, Google Careers, LinkedIn, Indeed, etc.)
- Results grid of cards showing: title, URL domain, description snippet
- "Import" button per card → calls `saveJobApplication()` with scraped data pre-filled (job URL, title, description markdown) → navigates to application detail
- Loading/empty/error states
- Route: `/search-jobs`

**4. Update `src/App.tsx`**
- Add route for `/search-jobs` → `SearchJobs` component
- Import the new page

**5. Update `src/pages/Applications.tsx`**
- Add "Search Jobs" button next to "New Application" in header

**6. Help entry in `src/lib/helpEntries.ts`**
- Register help for slug `search-jobs` with route `/search-jobs`

**7. Tutorial step in `src/lib/tutorial/steps.ts`**
- Add step for the search jobs button on the Applications page

**8. Manual QA entries in `src/lib/qaEntries.ts`**
- `qa-search-jobs-basic` — basic search returns results
- `qa-search-jobs-import` — importing a result creates an application
- `qa-search-jobs-site-filter` — site filter narrows results
- `qa-search-jobs-empty` — empty query / no results handling

**9. Automated test: `src/test/maui/jobSearch.test.ts`**
- Query validation (empty query rejected, whitespace trimmed)
- Site filter URL construction logic
- Result parsing (handles missing fields gracefully)
- Import flow (result maps to application params correctly)

### Files summary
| File | Action |
|------|--------|
| `supabase/functions/search-jobs/index.ts` | Create |
| `src/lib/api/jobSearch.ts` | Create |
| `src/pages/SearchJobs.tsx` | Create |
| `src/App.tsx` | Edit — add route |
| `src/pages/Applications.tsx` | Edit — add button |
| `src/lib/helpEntries.ts` | Edit — add entry |
| `src/lib/tutorial/steps.ts` | Edit — add step |
| `src/lib/qaEntries.ts` | Edit — add 4 test cases |
| `src/test/maui/jobSearch.test.ts` | Create |

