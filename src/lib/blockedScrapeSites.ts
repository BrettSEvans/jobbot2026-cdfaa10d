/**
 * Registry of sites that block automated scraping.
 * Tracks known blocked hostnames and learns new ones at runtime.
 * Every RECHECK_INTERVAL attempts, allows a scrape to retest if blocking persists.
 * Runtime-discovered blocks are persisted to localStorage so all sessions benefit.
 */

const STORAGE_KEY = "resuvibe_blocked_scrape_sites";
const COUNTS_KEY = "resuvibe_blocked_scrape_counts";

const KNOWN_BLOCKED = new Set([
  "linkedin.com",
  "www.linkedin.com",
  "glassdoor.com",
  "www.glassdoor.com",
]);

const RECHECK_INTERVAL = 100;

// Hydrate from localStorage
function loadPersistedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore corrupt data */ }
  return new Set<string>();
}

function loadPersistedCounts(): Map<string, number> {
  try {
    const raw = localStorage.getItem(COUNTS_KEY);
    if (raw) return new Map(Object.entries(JSON.parse(raw) as Record<string, number>));
  } catch { /* ignore */ }
  return new Map<string, number>();
}

const runtimeBlocked = loadPersistedSet();
const attemptCounts = loadPersistedCounts();

function persistBlocked() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...runtimeBlocked]));
  } catch { /* quota exceeded — non-critical */ }
}

function persistCounts() {
  try {
    const obj: Record<string, number> = {};
    attemptCounts.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(COUNTS_KEY, JSON.stringify(obj));
  } catch { /* non-critical */ }
}

function normalizeHostname(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Returns true if the site is blocked (and this is NOT a recheck attempt). */
export function isBlockedSite(url: string): boolean {
  const host = normalizeHostname(url);
  if (!host) return false;

  const blocked = KNOWN_BLOCKED.has(host) || runtimeBlocked.has(host);
  if (!blocked) return false;

  // Increment attempt counter; every Nth attempt allow a recheck
  const count = (attemptCounts.get(host) ?? 0) + 1;
  if (count >= RECHECK_INTERVAL) {
    attemptCounts.set(host, 0);
    persistCounts();
    return false; // allow scrape attempt to revalidate
  }
  attemptCounts.set(host, count);
  persistCounts();
  return true;
}

/** Mark a hostname as blocked (called after a failed scrape). */
export function addBlockedSite(hostname: string) {
  const h = hostname.toLowerCase();
  runtimeBlocked.add(h);
  attemptCounts.set(h, 0);
  persistBlocked();
  persistCounts();
}

/** Remove a hostname from the runtime blocked list (called after a successful recheck). */
export function removeSiteBlock(hostname: string) {
  const h = hostname.toLowerCase();
  runtimeBlocked.delete(h);
  attemptCounts.delete(h);
  persistBlocked();
  persistCounts();
}

/** User-friendly message explaining why the site is blocked. */
export function getBlockedReason(url: string): string | null {
  const host = normalizeHostname(url);
  if (!host) return null;
  if (!KNOWN_BLOCKED.has(host) && !runtimeBlocked.has(host)) return null;
  return `${host} blocks automated scraping. Please paste the job description text directly instead.`;
}
