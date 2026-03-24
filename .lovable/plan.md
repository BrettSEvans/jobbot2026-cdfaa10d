

## Bug Analysis: Dashboard Still Defaulting to GTM

### Root Cause

There are **two bugs** working together:

**Bug 1: The LLM returns raw HTML instead of JSON.** The system prompt says "OUTPUT: ONLY valid JSON" but the LLM (Gemini 2.5 Pro) is generating a complete HTML page with embedded `__DASHBOARD_DATA__` JSON. The `parseLlmJsonOutput()` call fails, and the code falls through to the raw HTML fallback path (lines 536-544).

**Bug 2: The JD alignment validator only runs on the JSON path.** The validation (lines 510-535) is inside the `if (parsed)` block. When the LLM returns HTML instead of JSON, the `else` branch (line 536) saves the raw HTML **without any validation at all** — no department check, no keyword coverage, nothing. The dashboard goes straight to the database with whatever department the LLM hallucinated.

In this case: the correct department "Customer Success / Delivery" was sent to the edge function, but the LLM embedded `"department":"GTM / Sales / Marketing"` in its HTML output, and no validator caught it because the validator was bypassed entirely.

### Fix Plan

**1. `src/lib/backgroundGenerator.ts` — Run validation on raw HTML fallback path**

In the `else` branch (line 536), extract the embedded `__DASHBOARD_DATA__` JSON from the raw HTML and run the validator against it:

```typescript
} else {
  console.warn("Failed to parse dashboard JSON, falling back to raw HTML");
  dashboardHtml = dashboardRaw;
  // ... existing HTML trimming ...

  // Extract embedded JSON from __DASHBOARD_DATA__ for validation
  const dataMatch = dashboardHtml.match(/window\.__DASHBOARD_DATA__\s*=\s*({[\s\S]*?});?\s*<\/script>/);
  if (dataMatch) {
    try {
      const embeddedData = JSON.parse(dataMatch[1]);
      // Fix department mismatch in embedded data
      if (department && embeddedData?.meta) {
        embeddedData.meta.department = department;
        // Replace in HTML too
        dashboardHtml = dashboardHtml.replace(dataMatch[0], 
          `window.__DASHBOARD_DATA__=${JSON.stringify(embeddedData)};</script>`);
      }
      dashboardData = embeddedData;
      // Run validation on extracted data
      const alignmentReport = validateDashboardAlignment(embeddedData, jdIntelligence);
      // ... store alignment report same as JSON path ...
    } catch { /* extraction failed, save as-is */ }
  }
}
```

This ensures:
- The department is **corrected** in the HTML output to match the JD intelligence
- The validator runs even when the LLM returns raw HTML
- `dashboard_data` is populated so future refinements have structured data

**2. `supabase/functions/generate-dashboard/index.ts` — Strengthen JSON-only instruction**

Add a stronger instruction to the system prompt to reduce the frequency of HTML output:
- Add: `"CRITICAL: Return ONLY the raw JSON object. Do NOT wrap it in HTML, script tags, or markdown fences. Do NOT generate a full HTML page."`

### Files to Change
- `src/lib/backgroundGenerator.ts` — Add embedded JSON extraction + validation in fallback path
- `supabase/functions/generate-dashboard/index.ts` — Strengthen JSON-only prompt instruction

