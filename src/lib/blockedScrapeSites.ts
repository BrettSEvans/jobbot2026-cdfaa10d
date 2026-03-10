/**
 * Registry of sites that block automated scraping.
 * Tracks known blocked hostnames and learns new ones at runtime.
 * Every RECHECK_INTERVAL attempts, allows a scrape to retest if blocking persists.
 *
 * The shared blocked list is stored in a database table so ALL users benefit
 * from any single user's discovery of a blocked site.
 * Attempt counters remain in localStorage (per-browser recheck cadence).
 */

import { supabase } from "@/integrations/supabase/client";

const COUNTS_KEY = "resuvibe_blocked_scrape_counts";

const KNOWN_BLOCKED = new Set([
  "linkedin.com",
  "www.linkedin.com",
  "glassdoor.com",
  "www.glassdoor.com",
]);

const RECHECK_INTERVAL = 100;

/** In-memory cache of DB-fetched blocked hostnames (refreshed periodically). */
let dbBlockedCache = new Set<string>();
let lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

// --- Attempt counts (remain per-browser in localStorage) ---

function loadPersistedCounts(): Map<string, number> {
  try {
    const raw = localStorage.getItem(COUNTS_KEY);
    if (raw) return new Map(Object.entries(JSON.parse(raw) as Record<string, number>));
  } catch { /* ignore */ }
  return new Map<string, number>();
}

const attemptCounts = loadPersistedCounts();

function persistCounts() {
  try {
    const obj: Record<string, number> = {};
    attemptCounts.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(COUNTS_KEY, JSON.stringify(obj));
  } catch { /* quota exceeded — non-critical */ }
}

// --- DB helpers ---

/** Fetch the shared blocked list from the database (with in-memory caching). */
async function refreshDbCache(): Promise<void> {
  if (Date.now() - lastFetchedAt < CACHE_TTL_MS) return;
  try {
    const { data } = await supabase
      .from("blocked_scrape_sites")
      .select("hostname");
    if (data) {
      dbBlockedCache = new Set(data.map((r) => r.hostname));
      lastFetchedAt = Date.now();
    }
  } catch (e) {
    console.warn("Failed to fetch blocked sites from DB:", e);
  }
}

/** Eagerly refresh on module load (non-blocking). */
refreshDbCache();

// --- Hostname util ---

function normalizeHostname(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

// --- Public API ---

/**
 * Returns true if the site is blocked (and this is NOT a recheck attempt).
 * Checks the hardcoded list + the shared DB cache synchronously.
 * Triggers a background cache refresh if stale.
 */
export function isBlockedSite(url: string): boolean {
  // Trigger non-blocking refresh if cache is stale
  refreshDbCache();

  const host = normalizeHostname(url);
  if (!host) return false;

  const blocked = KNOWN_BLOCKED.has(host) || dbBlockedCache.has(host);
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

/**
 * Mark a hostname as blocked.
 * Writes to the shared DB table so all users benefit immediately.
 */
export async function addBlockedSite(hostname: string) {
  const h = hostname.toLowerCase();
  dbBlockedCache.add(h);
  attemptCounts.set(h, 0);
  persistCounts();

  try {
    await supabase.from("blocked_scrape_sites").upsert(
      { hostname: h, last_confirmed_at: new Date().toISOString() },
      { onConflict: "hostname" }
    );
  } catch (e) {
    console.warn("Failed to persist blocked site to DB:", e);
  }
}

/**
 * Remove a hostname from the blocked list (called after a successful recheck).
 * Deletes from the shared DB table so all users benefit.
 */
export async function removeSiteBlock(hostname: string) {
  const h = hostname.toLowerCase();
  dbBlockedCache.delete(h);
  attemptCounts.delete(h);
  persistCounts();

  try {
    await supabase.from("blocked_scrape_sites").delete().eq("hostname", h);
  } catch (e) {
    console.warn("Failed to remove blocked site from DB:", e);
  }
}

/** User-friendly message explaining why the site is blocked. */
export function getBlockedReason(url: string): string | null {
  const host = normalizeHostname(url);
  if (!host) return null;
  if (!KNOWN_BLOCKED.has(host) && !dbBlockedCache.has(host)) return null;
  return `${host} blocks automated scraping. Please paste the job description text directly instead.`;
}
