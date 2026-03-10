/**
 * Registry of sites that block automated scraping.
 * Tracks known blocked hostnames and learns new ones at runtime.
 * Every RECHECK_INTERVAL attempts, allows a scrape to retest if blocking persists.
 */

const KNOWN_BLOCKED = new Set([
  "linkedin.com",
  "www.linkedin.com",
  "glassdoor.com",
  "www.glassdoor.com",
]);

const runtimeBlocked = new Set<string>();
const attemptCounts = new Map<string, number>();
const RECHECK_INTERVAL = 100;

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
    return false; // allow scrape attempt to revalidate
  }
  attemptCounts.set(host, count);
  return true;
}

/** Mark a hostname as blocked (called after a failed scrape). */
export function addBlockedSite(hostname: string) {
  const h = hostname.toLowerCase();
  runtimeBlocked.add(h);
  attemptCounts.set(h, 0);
}

/** Remove a hostname from the runtime blocked list (called after a successful recheck). */
export function removeSiteBlock(hostname: string) {
  const h = hostname.toLowerCase();
  runtimeBlocked.delete(h);
  attemptCounts.delete(h);
  // Note: KNOWN_BLOCKED entries are not removed — they'll just pass on recheck
}

/** User-friendly message explaining why the site is blocked. */
export function getBlockedReason(url: string): string | null {
  const host = normalizeHostname(url);
  if (!host) return null;
  if (!KNOWN_BLOCKED.has(host) && !runtimeBlocked.has(host)) return null;
  return `${host} blocks automated scraping. Please paste the job description text directly instead.`;
}
