import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Server-side JSON repair & validation ───

/** Strip markdown fences and extract the outermost JSON object */
function extractJsonString(raw: string): string {
  // Remove markdown fences
  let s = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  // Find first { and last }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1) return s;
  if (end === -1) return s.slice(start);
  return s.slice(start, end + 1);
}

/** Sanitize JS-isms that break JSON.parse */
function sanitizeJsonString(s: string): string {
  // Replace new Date(...) with string
  s = s.replace(/new\s+Date\([^)]*\)/g, '"2026-01-01"');
  // Remove trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, '$1');
  // Quote unquoted keys (simple heuristic)
  s = s.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g, '$1"$2":');
  return s;
}

/** Attempt to close truncated JSON by counting brackets */
function repairTruncatedJson(s: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      if (stack.length && stack[stack.length - 1] === ch) stack.pop();
    }
  }

  // Close any unclosed string
  if (inString) s += '"';

  // Remove any trailing comma before we close brackets
  s = s.replace(/,\s*$/, '');

  // Close unclosed brackets in reverse order
  while (stack.length) s += stack.pop();

  return s;
}

/** Full parse pipeline: extract → sanitize → repair → parse */
function parseAiJson(raw: string): any | null {
  const extracted = extractJsonString(raw);

  // 1) Try raw extracted JSON first (AI usually outputs valid JSON)
  try { return JSON.parse(extracted); } catch (_) { /* continue */ }

  // 2) Try with trailing-comma and Date() fixes only (safe transforms)
  const lightSanitized = extracted
    .replace(/new\s+Date\([^)]*\)/g, '"2026-01-01"')
    .replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(lightSanitized); } catch (_) { /* continue */ }

  // 3) Try repairing truncated JSON
  const repaired = repairTruncatedJson(lightSanitized);
  try { return JSON.parse(repaired); } catch (_) { /* continue */ }

  // 4) Strip control chars
  const cleaned = repaired.replace(/[\x00-\x1F\x7F]/g, (c) => c === '\n' || c === '\r' || c === '\t' ? c : '');
  try { return JSON.parse(cleaned); } catch (_) { /* continue */ }

  // 5) Last resort: aggressive sanitization (unquoted keys)
  const fullSanitized = sanitizeJsonString(extracted);
  const fullRepaired = repairTruncatedJson(fullSanitized);
  try { return JSON.parse(fullRepaired); } catch (_) { return null; }
}

/** Validate the dashboard schema and auto-repair common issues */
function validateAndRepair(data: any): { valid: boolean; data?: any; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Parsed result is not an object'] };
  }

  // Required top-level fields
  if (!data.meta) { data.meta = { companyName: 'Unknown', jobTitle: 'Unknown', department: 'General' }; errors.push('Added missing meta'); }
  if (!data.branding) { errors.push('Missing branding'); }
  if (!data.navigation || !Array.isArray(data.navigation)) { errors.push('Missing navigation'); return { valid: false, data, errors }; }
  if (!data.sections || !Array.isArray(data.sections)) { errors.push('Missing sections'); return { valid: false, data, errors }; }

  // Ensure navigation has agentic-workforce and cfo-view
  const navIds = new Set(data.navigation.map((n: any) => n.id));
  if (!navIds.has('agentic-workforce')) {
    data.navigation.push({ id: 'agentic-workforce', label: 'Agentic Workforce', icon: 'smart_toy' });
    errors.push('Added missing agentic-workforce nav');
  }
  if (!navIds.has('cfo-view')) {
    data.navigation.push({ id: 'cfo-view', label: 'CFO View', icon: 'account_balance' });
    errors.push('Added missing cfo-view nav');
  }

  // Ensure globalFilters options start with "All"
  if (Array.isArray(data.globalFilters)) {
    for (const f of data.globalFilters) {
      if (Array.isArray(f.options) && f.options[0] !== 'All') {
        f.options.unshift('All');
        errors.push(`Prepended "All" to filter ${f.id}`);
      }
    }
  }

  // Validate sections
  for (const sec of data.sections) {
    if (!sec.id) { errors.push('Section missing id'); }
    if (!sec.title) { errors.push('Section missing title'); }
    if (!sec.metrics) sec.metrics = [];
    if (!sec.charts) sec.charts = [];
    if (!sec.tables) sec.tables = [];
  }

  // Ensure agenticWorkforce and cfoScenarios exist (even if empty)
  if (!data.agenticWorkforce) { data.agenticWorkforce = []; errors.push('Added empty agenticWorkforce'); }
  if (!data.cfoScenarios) { data.cfoScenarios = []; errors.push('Added empty cfoScenarios'); }

  return { valid: true, data, errors };
}

/** Consume an SSE stream and accumulate content deltas */
async function consumeSseStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const json = line.slice(6).trim();
      if (json === '[DONE]') break;

      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) accumulated += content;
      } catch { /* skip unparseable chunk */ }
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    for (let raw of buffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (!raw.startsWith('data: ')) continue;
      const json = raw.slice(6).trim();
      if (json === '[DONE]') continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) accumulated += content;
      } catch { /* skip */ }
    }
  }

  return accumulated;
}

// ─── System prompt builder (unchanged) ───

function buildSystemPrompt(branding: any, competitors: string[], customers: string[], products: string[], department: string, companyName: string, jobTitle: string, researchedSections?: any[]): string {
  const brandingContext = branding ? `
Company Branding (derive Material You tonal palette from these colors):
- Primary Colors: ${JSON.stringify(branding.colors || {})}
- CSS-Extracted Colors: ${JSON.stringify(branding.extractedColors || {})}
- Fonts: ${JSON.stringify(branding.fonts || [])}
- CSS-Extracted Fonts: ${JSON.stringify(branding.extractedFonts || [])}
- Logo URL: ${branding.logo || branding.images?.logo || 'N/A'}
Use the dominant extracted colors as the seed for the Material You tonal palette in the branding object.
` : 'No branding data — use teal (#0a8080) as primary, coral (#f45d48) as secondary.';

  const competitorContext = competitors?.length ? `\nKey Competitors: ${competitors.join(', ')}` : '';
  const customerContext = customers?.length ? `\nTarget Customers: ${customers.join(', ')}` : '';
  const productContext = products?.length ? `\nCompany Products: ${products.join(', ')}` : '';

  const sectionInstructions = researchedSections?.length
    ? `
SECTION BLUEPRINT (from Research Agent):
A research agent has already determined the optimal dashboard sections for this role. Use the following section specifications as your blueprint. Generate the full dashboard JSON following the schema below, but use THESE sections instead of inventing your own. Fill in realistic data for each metric, chart, and table based on the specifications.

Always append the 'agentic-workforce' and 'cfo-view' navigation entries and their corresponding data (agenticWorkforce array and cfoScenarios array) regardless of what the research agent returned.

Research Agent Output:
${JSON.stringify(researchedSections, null, 2)}

For each researched section:
- Use the provided id, label, icon, and description exactly
- Assign a UNIQUE "layout" mode to each section (see LAYOUT MODES below) — NO two adjacent sections may share the same layout
- Generate metrics with realistic values matching the valueFormat hints
- Generate chart data matching the chart specs (type, axes, datasets)
- Generate table schemas matching the column definitions and use generateRows with the provided field types
- Each table must have generateRows count >= 500
`
    : `
SECTION REQUIREMENTS:
- 6-8 sections covering: Overview, Pipeline/Revenue, Competitors, Customers, Products, Analytics, plus always include "agentic-workforce" and "cfo-view" in navigation
- Each section: unique description, 3-5 metrics, 2-3 charts (VARY chart types — see CHART TYPE DIVERSITY below), 1 table with generateRows count >= 500
- Assign a UNIQUE "layout" mode to each section (see LAYOUT MODES below) — NO two adjacent sections may share the same layout
- Include at least ONE horizontalBar chart (Gantt-style) with time-based labels
`;

  return `You are a business intelligence data architect and expert dashboard UX designer. Generate a structured JSON object for a dashboard that tells a DIVERSE visual story across sections.

CRITICAL: Return ONLY the raw JSON object. Do NOT wrap it in HTML, script tags, or markdown fences. Do NOT generate a full HTML page. Start with { and end with }. No other output.

## LAYOUT MODES
Each section MUST have a "layout" field. Available modes:
- "default" — metrics grid → charts side-by-side → table below (use for max 1-2 sections)
- "kpi-spotlight" — one hero metric card (large, colored) + secondary metric cards. Best for overview/summary sections.
- "split-panel" — 60/40 two-column: left has a large chart, right has stacked metrics + mini chart. Great for analysis sections.
- "full-width-timeline" — metrics above, then a single full-width chart (gantt/horizontalBar/area). Best for timeline/roadmap data.
- "grid-cards" — 3×2 card grid, each card has a metric + embedded mini chart. Best for multi-dimensional comparisons.
- "map-table" — side-by-side: left has a heatmap/chart, right has a data table. Best for geographic or cross-dimensional data.

RULES: No two adjacent sections may use the same layout. Use at least 4 different layouts across all sections.

## CHART TYPE DIVERSITY
Available chart types: "bar", "line", "doughnut", "pie", "radar", "scatter", "horizontalBar", "area", "gantt", "heatmap", "waterfall", "funnel"

RULES:
- Each section MUST use a different PRIMARY chart type from the previous section
- No more than 30% of all charts should be bar or line charts
- Include at least ONE of each: heatmap, gantt or horizontalBar, and one of waterfall/funnel across the entire dashboard
- Chart type selection guide:
  * "gantt" — project timelines, implementation phases, team workstreams (horizontal stacked bars with task labels)
  * "heatmap" — cross-dimensional comparisons (region×quarter, product×metric). Data format: datasets = rows, labels = columns, data = cell values
  * "waterfall" — financial breakdowns, revenue build-ups, cost attribution (incremental positive/negative values)
  * "funnel" — pipeline conversion, hiring funnel, adoption stages (descending values)
  * "radar" — multi-axis capability comparisons, competitive positioning
  * "scatter" — correlation analysis, portfolio positioning
  * "area" — cumulative trends, stacked composition over time

## GLOBAL FILTERS
Generate a "globalFilters" array with 3-4 filters relevant to the role/industry. These create a sticky filter bar for cross-page filtering.

CRITICAL FILTER-DATA ALIGNMENT RULES:
- Every filter option value (e.g., "US", "EMEA", "Enterprise") MUST appear as a verbatim value in at least one column of every section's table generateRows fields. Use the EXACT same strings.
- For region filters: use the filter option values (e.g., "US", "CA", "UK", "EU") as the "options" array in the corresponding region/geo field of every table's generateRows config.
- For product/segment filters: use the filter option values as the "options" array in the product/segment pick fields.
- Chart labels should also use these exact filter option values where the dimension applies.
- This ensures clicking a filter value actually matches rows and chart labels.

Format:
"globalFilters": [
  { "id": "region", "label": "Region", "type": "dropdown", "options": ["All", "US", "CA", "UK", "EU"] },
  { "id": "quarter", "label": "Quarter", "type": "segmented", "options": ["All", "Q1", "Q2", "Q3", "Q4"] },
  { "id": "product", "label": "Product", "type": "chips", "options": ["All", "Enterprise", "SMB", "Growth"] }
]
Filter types: "dropdown", "segmented", "chips". First option MUST be "All" for every filter.

JSON SCHEMA (follow EXACTLY):
{
  "meta": {
    "companyName": "string",
    "jobTitle": "string", 
    "department": "string",
    "logoUrl": "string (optional)"
  },
  "branding": {
    "primary": "#hex",
    "onPrimary": "#hex",
    "primaryContainer": "#hex",
    "onPrimaryContainer": "#hex",
    "secondary": "#hex",
    "onSecondary": "#hex",
    "surface": "#hex",
    "onSurface": "#hex",
    "surfaceVariant": "#hex",
    "outline": "#hex",
    "error": "#hex",
    "fontHeading": "Google Font name",
    "fontBody": "Google Font name"
  },
  "globalFilters": [
    { "id": "string", "label": "string", "type": "dropdown|segmented|chips", "options": ["string"] }
  ],
  "navigation": [
    { "id": "unique-id", "label": "Section Name", "icon": "material_icon_name" }
  ],
  "sections": [
    {
      "id": "matches navigation id",
      "title": "Section Title",
      "description": "Unique contextual description (2-3 sentences, specific to this section)",
      "layout": "default|kpi-spotlight|split-panel|full-width-timeline|grid-cards|map-table",
      "metrics": [
        { "label": "Metric Name", "value": "$1.2M", "change": "+12%", "trend": "up|down|neutral" }
      ],
      "charts": [
        {
          "id": "unique-chart-id",
          "title": "Chart Title",
          "type": "bar|line|doughnut|pie|radar|scatter|horizontalBar|area|gantt|heatmap|waterfall|funnel",
          "data": {
            "labels": ["Label1", "Label2"],
            "datasets": [{
              "label": "Dataset Name",
              "data": [100, 200],
              "backgroundColor": "#hex or [array]",
              "borderColor": "#hex or [array]",
              "fill": false,
              "tension": 0.3
            }]
          }
        }
      ],
      "tables": [
        {
          "id": "unique-table-id",
          "title": "Table Title",
          "columns": [{ "key": "fieldKey", "label": "Column Header" }],
          "generateRows": {
            "count": 500,
            "seed": 42,
            "fields": {
              "fieldKey": {
                "type": "personName|company|date|futureDate|currency|status|region|product|percent|integer|email|pick",
                "options": ["for pick/status/company/region/product types"],
                "min": 0, "max": 100,
                "maxDays": 365
              }
            }
          }
        }
      ]
    }
  ],
  "agenticWorkforce": [
    {
      "name": "Creative Agent Name",
      "coreFunctionality": "2-3 sentence description",
      "interfacingTeams": "Team1, Team2, Team3"
    }
  ],
  "cfoScenarios": [
    {
      "id": "pricing|headcount|expansion",
      "title": "Scenario Title",
      "description": "What this models",
      "type": "pricing|headcount|expansion",
      "sliders": [
        { "id": "sliderId", "label": "Slider Label", "min": -30, "max": 30, "step": 1, "default": 0, "unit": "%" }
      ],
      "baseline": { "revenue": 10000000, "volume": 5000 },
      "quarters": ["Q1 2026", "Q2 2026", "Q3 2026"],
      "chartType": "line"
    }
  ]
}

CRITICAL REQUIREMENTS:
${sectionInstructions}
- Navigation MUST include entries with id "agentic-workforce" and "cfo-view" — these are rendered by the template engine
- 8-10 agentic workforce agents customized to the role
- 3 CFO scenarios: one "pricing" (sliders: priceChange, elasticity, growthRate), one "headcount" (sliders: newHires, rampTime, quota), one "expansion" (sliders: tam, penetration, investment)
- All text must be specific to ${companyName || 'the company'} and the ${jobTitle || 'role'}
- Branding colors derived from provided branding data using Material You tonal palette principles
- Chart datasets: use contextual colors derived from branding, not random colors
- CONTRAST REQUIREMENT: The "outline" color is used for secondary text (labels, descriptions). It MUST have at least 4.5:1 contrast ratio against the "surface" background. Use a dark value like #49454F or darker — never lighter than #5F5F6F. Avoid light greys (#79747E or lighter) for any text on light backgrounds.
- Table generateRows fields: use company-specific options (competitor names, product names, region names from context)
- HEATMAP DATA FORMAT: For heatmap charts, datasets are rows (each with a label), labels are columns, and each dataset's data array contains the cell values for that row.
- WATERFALL DATA FORMAT: For waterfall charts, provide a single dataset with incremental values (positive and negative). The rendering engine calculates floating bars automatically.
- FUNNEL DATA FORMAT: For funnel charts, provide descending values in a single dataset. Labels are the funnel stages.
- GANTT DATA FORMAT: For gantt charts, use multiple datasets (phases/workstreams) with stacked horizontal bars. Labels are task names.
- FILTER-DATA ALIGNMENT: Every globalFilter option value MUST appear verbatim in the corresponding table generateRows field options. For example, if region filter has ["US","CA","UK","EU"], then every table with a region field must use options: ["US","CA","UK","EU"]. Chart labels for that dimension must also use these exact values. This is CRITICAL for filtering to work.
${brandingContext}
${competitorContext}
${customerContext}
${productContext}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, branding, companyName, jobTitle, competitors, customers, products, department, templateHtml, researchedSections, selectedCfoScenarios, userColors } = await req.json();

    if (!jobDescription) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const effectiveBranding = userColors
      ? { ...branding, colors: { ...(branding?.colors || {}), primary: userColors.primary, secondary: userColors.secondary }, userColors }
      : branding;

    const systemPrompt = buildSystemPrompt(effectiveBranding, competitors, customers, products, department || 'General', companyName || 'Unknown', jobTitle || 'Unknown', researchedSections);

    const cfoContext = selectedCfoScenarios?.length
      ? `\n\nUSER-SELECTED CFO SCENARIOS (use these exact scenarios, fill in realistic data, ALL charts must use $ currency labels on Y-axis):\n${JSON.stringify(selectedCfoScenarios, null, 2)}`
      : '\n\nAll CFO scenario charts must use $ currency labels on Y-axis values.';

    const templateContext = templateHtml ? `\n\nREFERENCE TEMPLATE (use as structural guide for section layout, chart types, and data patterns — but generate NEW data for the new company): Provided separately.` : '';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate the dashboard JSON for:\n\nCompany: ${companyName || 'Unknown'}\nRole: ${jobTitle || 'Unknown'}\nDepartment: ${department || 'Not specified'}\n\nJob Description:\n${jobDescription}${templateContext}${cfoContext}`
          },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Buffer the stream, parse, validate, return clean JSON ───
    if (!response.body) {
      return new Response(JSON.stringify({ success: false, error: 'No response body from AI' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[generate-dashboard] Consuming AI stream...');
    const rawOutput = await consumeSseStream(response.body);
    console.log('[generate-dashboard] Stream consumed, length:', rawOutput.length);

    if (!rawOutput.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'AI returned empty response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = parseAiJson(rawOutput);
    if (!parsed) {
      console.error('[generate-dashboard] JSON parse failed. First 500 chars:', rawOutput.slice(0, 500));
      return new Response(JSON.stringify({ success: false, error: 'AI response could not be parsed as JSON. Please regenerate.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validation = validateAndRepair(parsed);
    if (validation.errors.length) {
      console.log('[generate-dashboard] Validation repairs:', validation.errors);
    }

    if (!validation.valid) {
      console.error('[generate-dashboard] Validation failed:', validation.errors);
      return new Response(JSON.stringify({ success: false, error: `Dashboard validation failed: ${validation.errors.join('; ')}` }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: validation.data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('Dashboard generation error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'An internal error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
