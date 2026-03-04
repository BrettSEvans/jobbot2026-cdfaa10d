/**
 * Dashboard assembler — combines JSON data with fixed templates.
 * Two modes:
 *   1. assembleDashboardHtml() — single HTML string for iframe srcDoc
 *   2. getDashboardZipFiles() — separate files for ZIP download
 */

import type { DashboardData } from "./schema";
import { getShellHtml } from "./templates/shell";
import { getStylesCss } from "./templates/styles";
import { getScriptsJs } from "./templates/scripts";

/**
 * Assemble a single self-contained HTML string (for iframe preview & DB storage).
 */
export function assembleDashboardHtml(data: DashboardData): string {
  const dataJson = JSON.stringify(data);
  return getShellHtml({
    title: `${data.meta.companyName} — ${data.meta.jobTitle} Dashboard`,
    inlineCss: getStylesCss(),
    inlineJs: getScriptsJs(),
    inlineData: dataJson,
  });
}

/**
 * Get separate files for ZIP download.
 */
export function getDashboardZipFiles(
  data: DashboardData
): Record<string, string> {
  return {
    "index.html": getShellHtml({
      title: `${data.meta.companyName} — ${data.meta.jobTitle} Dashboard`,
      externalCss: "styles.css",
      externalJs: "scripts.js",
      externalData: "data.js",
    }),
    "styles.css": getStylesCss(),
    "scripts.js": getScriptsJs(),
    "data.js": `window.__DASHBOARD_DATA__ = ${JSON.stringify(data, null, 2)};`,
  };
}

/**
 * Parse raw LLM output (potentially wrapped in markdown fences) into DashboardData.
 * Returns null if parsing fails.
 */
export function parseLlmJsonOutput(raw: string): DashboardData | null {
  let clean = raw.trim();
  // Strip markdown code fences
  clean = clean.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  // Find first { and last }
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    console.error("[DashboardParser] No JSON braces found in LLM output (length:", raw.length, ")");
    return null;
  }
  clean = clean.slice(firstBrace, lastBrace + 1);
  
  // Sanitize common LLM mistakes: JS expressions in JSON
  // new Date("...").getTime() → timestamp number
  clean = clean.replace(/new\s+Date\s*\(\s*["']([^"']*)["']\s*\)\.getTime\s*\(\s*\)/g, (_, dateStr) => {
    try { return String(new Date(dateStr).getTime()); } catch { return '0'; }
  });
  // new Date("...") → string
  clean = clean.replace(/new\s+Date\s*\(\s*["']([^"']*)["']\s*\)/g, '"$1"');
  clean = clean.replace(/new\s+Date\s*\(\s*\)/g, '"2025-01-01"');
  // Remove trailing commas before } or ] and collapse double commas
  clean = clean.replace(/,\s*,/g, ',');
  clean = clean.replace(/,\s*([}\]])/g, '$1');
  
  try {
    const parsed = JSON.parse(clean) as DashboardData;
    // Validate minimum required fields
    if (!parsed.meta || !parsed.branding || !parsed.navigation || !parsed.sections) {
      console.error("[DashboardParser] JSON parsed but missing required fields:", Object.keys(parsed));
      return null;
    }
    return parsed;
  } catch (e) {
    console.error("[DashboardParser] JSON.parse failed:", (e as Error).message, "| JSON length:", clean.length, "| Last 50 chars:", clean.slice(-50));
    return null;
  }
}
