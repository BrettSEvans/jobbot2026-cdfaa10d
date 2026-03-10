/**
 * Marketing attribution capture utility.
 * Reads UTM params and ref codes from the URL on landing,
 * persists them in localStorage to survive the signup/login flow,
 * then writes them to the user's profile on first authenticated session.
 */

const STORAGE_KEY = "resuvibe_attribution";

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
  landed_at: string;
}

/**
 * Capture UTM params + ref from the current URL.
 * First-touch only — if attribution is already stored, skip.
 */
export function captureAttribution(): void {
  if (localStorage.getItem(STORAGE_KEY)) return;

  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get("utm_source") ?? undefined;
  const utm_medium = params.get("utm_medium") ?? undefined;
  const utm_campaign = params.get("utm_campaign") ?? undefined;
  const utm_content = params.get("utm_content") ?? undefined;
  const utm_term = params.get("utm_term") ?? undefined;
  const ref = params.get("ref") ?? undefined;

  // Only store if there's at least one attribution param
  if (!utm_source && !utm_medium && !utm_campaign && !utm_content && !utm_term && !ref) return;

  const data: AttributionData = {
    ...(utm_source && { utm_source }),
    ...(utm_medium && { utm_medium }),
    ...(utm_campaign && { utm_campaign }),
    ...(utm_content && { utm_content }),
    ...(utm_term && { utm_term }),
    ...(ref && { ref }),
    landed_at: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Retrieve stored attribution data, or null if none. */
export function getStoredAttribution(): AttributionData | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AttributionData;
  } catch {
    return null;
  }
}

/** Clear stored attribution after it's been persisted to the database. */
export function clearAttribution(): void {
  localStorage.removeItem(STORAGE_KEY);
}
