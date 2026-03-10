

# Auto-Detect Blocked Sites with Periodic Revalidation

## Updated Plan

### 1. New file: `src/lib/blockedScrapeSites.ts` (~45 lines)

**Known blocked list** with a per-hostname attempt counter for periodic revalidation:

```typescript
const KNOWN_BLOCKED = new Set(["linkedin.com", "www.linkedin.com", "glassdoor.com", "www.glassdoor.com"]);
const runtimeBlocked = new Set<string>();
const attemptCounts = new Map<string, number>(); // hostname → count since last recheck
const RECHECK_INTERVAL = 100;
```

Exports:
- `isBlockedSite(url)` — normalizes hostname, checks both sets. Increments `attemptCounts` for the hostname. When count hits 100, returns `false` (allow scrape attempt) and resets counter.
- `addBlockedSite(hostname)` — adds to `runtimeBlocked`, resets counter.
- `removeSiteBlock(hostname)` — removes from `runtimeBlocked` (for when recheck succeeds).
- `getBlockedReason(hostname)` — returns user-friendly message.

The recheck logic: every 100th attempt on a blocked site, `isBlockedSite` returns `false`, allowing the scrape to proceed. If it succeeds, the caller removes the block. If it fails, the site stays blocked.

### 2. Update `src/lib/backgroundGenerator.ts`

In the scrape error handler (existing `isUnsupported` block):
- Import `addBlockedSite` and call it with the hostname on failure.

After a successful scrape:
- Import `removeSiteBlock` and call it with the hostname (handles the case where a recheck attempt succeeds).

### 3. Update `src/pages/NewApplication.tsx`

- Import `isBlockedSite`, `getBlockedReason` from the new utility.
- Add `blockedSiteMessage` state (`string | null`).
- Add a `useEffect` watching `jobUrl`: parse the URL, call `isBlockedSite()`. If blocked, set `useManualInput = true` and `blockedSiteMessage` with the reason. If not blocked, clear the message.
- Render an `Alert` (info variant) above the textarea when `blockedSiteMessage` is set, showing the reason and a note that the site periodically gets rechecked.
- In the `handleAnalyze` catch block: if error mentions scraping blocked, set `step` back to `"input"`, flip `useManualInput = true`, show toast. All form state (jobUrl, companyUrl, resume selections) is already preserved since they're independent state variables.

### Net effect

- ~45-line new utility with recheck-every-100 counter
- ~15 lines added to `NewApplication.tsx` (useEffect + Alert + catch update)
- ~3 lines added to `backgroundGenerator.ts` (addBlockedSite on fail, removeSiteBlock on success)
- No database changes
- Form state fully preserved on fallback — user continues seamlessly in manual paste mode

