import { errorResponse } from "../_shared/errorResponse.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetchWithRetry, getModel } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are a senior business analyst and dashboard architect. Given a company name, company URL, job title, department, and job description, determine the 8-12 most strategically important dashboard sections for someone in this role at this company. Also generate 7 CFO what-if scenarios ranked by relevance.

For each section, specify:
- "id": a unique kebab-case identifier (e.g. "pipeline-health", "revenue-analytics")
- "label": human-readable section name for navigation
- "icon": Material Icons Outlined name (e.g. "trending_up", "analytics", "groups")
- "description": 2-3 sentences explaining why this section matters for this role at this company
- "metrics": array of 3-5 KPI definitions, each with:
  - "label": KPI name
  - "valueFormat": example value format (e.g. "$1.2M", "85%", "1,234")
  - "changeFormat": example change format (e.g. "+12%", "-3%")
- "charts": array of 2-3 chart specifications, each with:
  - "title": chart title
  - "type": one of "bar", "line", "doughnut", "pie", "radar", "scatter", "horizontalBar", "area"
  - "xAxis": what the x-axis represents
  - "yAxis": what the y-axis/series represents
  - "datasets": number of datasets and what each represents
- "tables": array with 1 table specification:
  - "title": table title
  - "columns": array of { "key": "fieldKey", "label": "Column Header" }
  - "generateRowsFields": object mapping each column key to a field generator definition with:
    - "type": one of "personName", "company", "date", "futureDate", "currency", "status", "region", "product", "percent", "integer", "email", "pick"
    - "options": array of realistic options for "pick", "status", "company", "region", "product" types (use company-specific values)
    - "min"/"max": for numeric types
    - "maxDays": for date types

For each CFO scenario, specify:
- "id": unique kebab-case identifier
- "title": scenario title (e.g. "Premium Tier Pricing Strategy")
- "description": 2-3 sentences explaining what this scenario models and why it matters
- "type": one of "pricing", "headcount", "expansion"
- "relevanceRank": integer 1-7 (1 = most relevant to this role/company)
- "currencyFormat": true (all CFO charts should display $ labels)
- "sliders": array of 2-4 control definitions, each with:
  - "id": unique slider id
  - "label": control label
  - "min": minimum value
  - "max": maximum value
  - "step": step increment
  - "default": default value
  - "unit": display unit (e.g. "%", "people", "$K")
  - "controlType": one of "slider", "toggle", "segmented" — VARY these across scenarios for visual diversity
  - "options": for toggle (exactly 2 options) or segmented (3-5 options), array of { "label": "Display Label", "value": numericValue }
- "baseline": object with baseline numeric values (e.g. { "revenue": 10000000, "volume": 5000 })
- "quarters": array of quarter labels (e.g. ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"])
- "chartType": one of "line", "bar", "doughnut", "radar"

Think deeply about what THIS specific role at THIS specific company would need:
- A Sales AE at Stripe needs pipeline and payment volume data
- A Marketing Manager at HubSpot needs campaign performance and lead scoring
- A Data Engineer at Snowflake needs query performance and compute utilization
- A Product Manager at Figma needs feature adoption and user engagement

Make sections AND CFO scenarios highly specific to the company's industry, products, and the role's responsibilities. Use the company's actual product names, competitor names, and market segments when possible.

For CFO scenarios, think about what financial levers a CFO at THIS company would care about:
- SaaS companies: pricing tiers, seat expansion, churn impact, usage-based pricing
- Manufacturing: raw material costs, labor scaling, production capacity
- Fintech: transaction volume, risk reserves, regulatory capital
- Healthcare: patient volume, reimbursement rates, staffing ratios

Output ONLY valid JSON matching this schema:
{
  "sections": [...],
  "cfoScenarios": [...],
  "reasoning": "2-3 sentence explanation of why you chose these sections and scenarios for this role at this company."
}

Do NOT include markdown fences. Start with { and end with }.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobUrl, companyUrl, jobTitle, companyName, department, jobDescription } = await req.json();

    if (!jobDescription && !jobTitle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job description or job title is required' }),
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

    const userPrompt = `Research and determine the optimal dashboard sections and CFO scenarios for:

Company: ${companyName || 'Unknown'}
Company URL: ${companyUrl || 'N/A'}
Job Title: ${jobTitle || 'Unknown'}
Department: ${department || 'General'}
Job URL: ${jobUrl || 'N/A'}

Job Description:
${jobDescription || 'No description provided.'}`;

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: getModel('standard'),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
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
      return new Response(JSON.stringify({ error: 'AI research failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (_firstErr) {
      let clean = content.trim();
      clean = clean.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) {
        console.error('No JSON found in research response:', content.slice(0, 500));
        return new Response(JSON.stringify({ error: 'Failed to parse research output' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      clean = clean.slice(firstBrace, lastBrace + 1);
      clean = clean.replace(/,\s*([}\]])/g, '$1');
      try {
        parsed = JSON.parse(clean);
      } catch (e) {
        console.error('Failed to parse research JSON:', (e as Error).message, 'snippet:', clean.slice(0, 200));
        return new Response(JSON.stringify({ error: 'Failed to parse research output' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      console.error('Missing sections array in parsed output');
      return new Response(JSON.stringify({ error: 'Failed to parse research output' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      sections: parsed.sections,
      cfoScenarios: parsed.cfoScenarios || [],
      reasoning: parsed.reasoning || '',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Research error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'An internal error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
