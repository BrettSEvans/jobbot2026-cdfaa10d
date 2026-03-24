import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

  // If we have researched sections, use them as the blueprint
  const sectionInstructions = researchedSections?.length
    ? `
SECTION BLUEPRINT (from Research Agent):
A research agent has already determined the optimal dashboard sections for this role. Use the following section specifications as your blueprint. Generate the full dashboard JSON following the schema below, but use THESE sections instead of inventing your own. Fill in realistic data for each metric, chart, and table based on the specifications.

Always append the 'agentic-workforce' and 'cfo-view' navigation entries and their corresponding data (agenticWorkforce array and cfoScenarios array) regardless of what the research agent returned.

Research Agent Output:
${JSON.stringify(researchedSections, null, 2)}

For each researched section:
- Use the provided id, label, icon, and description exactly
- Generate metrics with realistic values matching the valueFormat hints
- Generate chart data matching the chart specs (type, axes, datasets)
- Generate table schemas matching the column definitions and use generateRows with the provided field types
- Each table must have generateRows count >= 500
`
    : `
SECTION REQUIREMENTS:
- 6-8 sections covering: Overview, Pipeline/Revenue, Competitors, Customers, Products, Analytics, plus always include "agentic-workforce" and "cfo-view" in navigation
- Each section: unique description, 3-5 metrics, 2-3 charts (VARY chart types), 1 table with generateRows count >= 500
- Include at least ONE horizontalBar chart (Gantt-style) with time-based labels
`;

  return `You are a business intelligence data architect. Generate a structured JSON object for a dashboard.

CRITICAL: Return ONLY the raw JSON object. Do NOT wrap it in HTML, script tags, or markdown fences. Do NOT generate a full HTML page. Start with { and end with }. No other output.

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
  "navigation": [
    { "id": "unique-id", "label": "Section Name", "icon": "material_icon_name" }
  ],
  "sections": [
    {
      "id": "matches navigation id",
      "title": "Section Title",
      "description": "Unique contextual description (2-3 sentences, specific to this section)",
      "metrics": [
        { "label": "Metric Name", "value": "$1.2M", "change": "+12%", "trend": "up|down|neutral" }
      ],
      "charts": [
        {
          "id": "unique-chart-id",
          "title": "Chart Title",
          "type": "bar|line|doughnut|pie|radar|scatter|horizontalBar|area",
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
- Table generateRows fields: use company-specific options (competitor names, product names, region names from context)
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
    const { jobDescription, branding, companyName, jobTitle, competitors, customers, products, department, templateHtml, researchedSections } = await req.json();

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

    const systemPrompt = buildSystemPrompt(branding, competitors, customers, products, department || 'General', companyName || 'Unknown', jobTitle || 'Unknown', researchedSections);

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
            content: `Generate the dashboard JSON for:\n\nCompany: ${companyName || 'Unknown'}\nRole: ${jobTitle || 'Unknown'}\nDepartment: ${department || 'Not specified'}\n\nJob Description:\n${jobDescription}${templateContext}`
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

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('Dashboard generation error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
