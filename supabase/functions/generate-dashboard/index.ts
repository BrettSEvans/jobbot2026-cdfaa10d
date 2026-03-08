import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const currentYear = now.getFullYear();
  const startDate = now.toISOString().split('T')[0];
  const q1Label = `Q${currentQuarter} ${currentYear}`;
  const q2Num = (currentQuarter % 4) + 1;
  const q2Year = currentQuarter >= 4 ? currentYear + 1 : currentYear;
  const q2Label = `Q${q2Num} ${q2Year}`;
  const q3Num = (q2Num % 4) + 1;
  const q3Year = q2Num >= 4 ? q2Year + 1 : q2Year;
  const q3Label = `Q${q3Num} ${q3Year}`;
  const monthNames = [];
  for (let i = 0; i < 9; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthNames.push(d.toLocaleString('en-US', { month: 'short' }));
  }

  // If we have researched sections, take only the FIRST 2 for domain slots
  const sectionInstructions = researchedSections?.length
    ? `
SECTION BLUEPRINT (from Research Agent):
A research agent has already determined optimal dashboard sections. Use ONLY the first 2 sections below for navigation slots #2 and #3. Ignore any additional sections.

Always include these 4 additional navigation entries regardless: "overview" (slot #1), "roadmap" (slot #4), "agentic-workforce" (slot #5), and "cfo-view" (slot #6).

Research Agent Output (use first 2 only):
${JSON.stringify((researchedSections || []).slice(0, 2), null, 2)}

For each researched section:
- Use the provided id, label, icon, and description exactly
- Generate metrics with realistic values matching the valueFormat hints
- Generate chart data matching the chart specs (type, axes, datasets)
- Generate table schemas matching the column definitions and use generateRows with the provided field types
- Each table must have generateRows count >= 500
`
    : `
SECTION REQUIREMENTS:
- Exactly 3 data sections: one "overview" (executive summary with KPIs, key charts, summary table), plus 2 role-specific domain sections (e.g., Pipeline, Competitive Intel, Engineering Velocity, Customer Health — pick based on job description)
- Navigation must also include "roadmap", "agentic-workforce", and "cfo-view" — 6 total tabs
- Each data section: unique description, 3-5 metrics, 2-3 charts (VARY chart types), 1 table with generateRows count >= 500
`;

  return `You are a business intelligence data architect. Generate a structured JSON object for a dashboard.

OUTPUT: ONLY valid JSON. No markdown fences, no explanation. Start with { and end with }.

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
    { "id": "overview", "label": "Executive Overview", "icon": "dashboard" },
    { "id": "domain-1-id", "label": "Domain Section 1", "icon": "material_icon" },
    { "id": "domain-2-id", "label": "Domain Section 2", "icon": "material_icon" },
    { "id": "roadmap", "label": "Roadmap", "icon": "timeline" },
    { "id": "agentic-workforce", "label": "Agentic Workforce", "icon": "smart_toy" },
    { "id": "cfo-view", "label": "CFO View", "icon": "account_balance" }
  ],
  "sections": [
    {
      "id": "matches navigation id (overview, domain-1, domain-2 only)",
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
  "roadmap": {
    "title": "Initiative title specific to company and role",
    "startDate": "${startDate}",
    "quarters": ["${q1Label}", "${q2Label}", "${q3Label}"],
    "months": ${JSON.stringify(monthNames)},
    "swimlanes": [
      {
        "id": "unique-swimlane-id",
        "department": "Department Name",
        "color": "#hex (derived from branding palette, distinct per swimlane)",
        "items": [
          {
            "id": "unique-item-id",
            "label": "Work Item Name",
            "startMonth": 0,
            "duration": 2,
            "type": "feature|infrastructure|milestone",
            "isCriticalPath": false,
            "tooltip": "Detailed description of this work item"
          }
        ]
      }
    ],
    "dependencies": [
      { "fromItem": "item-id-1", "toItem": "item-id-2", "label": "Optional dependency description" }
    ],
    "legend": [
      { "type": "feature", "label": "Feature", "color": "#hex" },
      { "type": "infrastructure", "label": "Infrastructure", "color": "#hex" },
      { "type": "milestone", "label": "Milestone", "color": "#hex" },
      { "type": "critical", "label": "Critical Path", "color": "#hex" }
    ]
  },
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
      "quarters": ["${q1Label}", "${q2Label}", "${q3Label}"],
      "chartType": "line"
    }
  ]
}

CRITICAL REQUIREMENTS:
${sectionInstructions}
- Navigation MUST have EXACTLY 6 entries in this order: overview, two domain sections, roadmap, agentic-workforce, cfo-view
- The "sections" array MUST have EXACTLY 3 entries (overview + 2 domain). Do NOT create section objects for roadmap, agentic-workforce, or cfo-view — those are rendered from their own top-level keys.

ROADMAP REQUIREMENTS:
- 4-6 department swimlanes derived from the job description (e.g., for TPM: Engineering, Product, Design, QA, DevOps; for GTM: Product Marketing, Sales, Customer Success, Revenue Ops)
- Each swimlane: 3-5 work items with realistic initiative names specific to ${companyName || 'the company'}
- startMonth is 0-indexed offset from today (0 = this month); duration in months
- At least 2 dependency connections between swimlanes
- At least 1 critical path (set isCriticalPath: true on connected items)
- Milestone items should have duration: 0
- Swimlane colors must be harmonious but distinct, derived from the branding palette
- All initiative names must reflect the scope described in the job description

- 8-10 agentic workforce agents customized to the role
- 3 CFO scenarios: one "pricing" (sliders: priceChange, elasticity, growthRate), one "headcount" (sliders: newHires, rampTime, quota), one "expansion" (sliders: tam, penetration, investment)
- meta.logoUrl MUST be set to the company logo URL from the branding data below. This is REQUIRED, not optional. If no logo URL is available, leave it as an empty string.
- All text must be specific to ${companyName || 'the company'} and the ${jobTitle || 'role'}
- Branding colors derived from provided branding data using Material You tonal palette principles
- Chart datasets: use contextual colors derived from branding, not random colors
- Table generateRows fields: use company-specific options (competitor names, product names, region names from context)
- DATE REALISM: Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. All reporting periods, chart month labels, and date fields must be realistic relative to today. Use the 3-6 months leading up to today for trend data. Upcoming deadlines should be in the future.
${brandingContext}
${competitorContext}
${customerContext}
${productContext}`;
}

async function logUsage(req: Request, assetType: string, edgeFunction: string): Promise<Response | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = data?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await svc.from('generation_usage').insert({ user_id: userId, asset_type: assetType, edge_function: edgeFunction });
  } catch (e) { console.warn('Usage logging failed, allowing request:', e); }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await logUsage(req, 'dashboard', 'generate-dashboard');

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

    const systemPrompt = buildSystemPrompt(branding, competitors, customers, products, department || 'GTM', companyName || 'Unknown', jobTitle || 'Unknown', researchedSections);

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
            content: `Generate the dashboard JSON for:\n\nCompany: ${companyName || 'Unknown'}\nRole: ${jobTitle || 'Unknown'}\nDepartment: ${department || 'GTM / Sales / Marketing'}\n\nJob Description:\n${jobDescription}${templateContext}`
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
