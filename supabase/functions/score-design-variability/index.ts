import { errorResponse } from "../_shared/errorResponse.ts";
import { aiFetchWithRetry, getModel } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { assets, branding } = await req.json();

    if (!assets || !Array.isArray(assets) || assets.length < 2) {
      return new Response(JSON.stringify({ error: 'At least 2 assets required for variability scoring' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const structuralSummaries = assets.map((a: { assetName: string; html: string }) => {
      const stripped = (a.html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '[STYLE_BLOCK]')
        .replace(/>[^<]+</g, '><')
        .slice(0, 3000);
      return { assetName: a.assetName, structure: stripped };
    });

    const brandingContext = branding
      ? `Company branding: colors=${JSON.stringify(branding.colors || {})}, fonts=${JSON.stringify(branding.fonts || {})}`
      : 'No branding data available';

    const resp = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a design analyst evaluating structural, visual, storytelling, style, and interactivity diversity across a set of HTML documents generated for the same job application. 

Evaluate these dimensions:

## 1. Layout Diversity (feeds into overallScore)
- Do documents use different layout patterns (tables, timelines, grids, cards, charts, lists)?
- Different header styles, section arrangements, color usage patterns?
- For dashboards: do sections use different layout modes (kpi-spotlight, split-panel, full-width-timeline, grid-cards, map-table)?

## 2. Branding Consistency (feeds into brandingScore)
- Do all documents appropriately use the company's brand colors/fonts?

## 3. Storytelling Variability (feeds into storytellingScore)
- Does each document frame the candidate from a DIFFERENT narrative angle? (e.g., strategic leader vs. analytical problem-solver vs. cross-functional collaborator vs. innovation driver)
- Are DIFFERENT skills and competencies highlighted across documents, or do they repeat the same talking points?
- Do documents use different framing techniques? (metrics/ROI, case studies, frameworks, stakeholder impact, before/after)

## 4. Style Variability (feeds into styleScore)
- **Content flow pattern**: What is the sequence of content block types in each document? (e.g., "header → paragraph → table → bullet list → chart" vs "header → two-column-grid → metrics-cards → timeline")
- **Column layout type**: Does each document use a different layout format? (single-column, two-column, sidebar, grid, centered, asymmetric)
- **Visual rhythm**: Do documents vary in spacing patterns, section density, and content block sizing?
- Penalize documents that share similar content-block sequencing or layout formats.

## 5. Interactivity & Chart Diversity (feeds into interactivityScore)
- For dashboards: evaluate variety of chart types used (bar, line, doughnut, heatmap, gantt, waterfall, funnel, radar, scatter, treemap)
- Penalize if >50% of charts are bar/line
- Award bonus for advanced chart types: gantt, heatmap, waterfall, funnel, treemap
- Evaluate presence of cross-page global filters (dropdown, segmented, chips)
- Evaluate interactive controls (sliders, toggles, segmented buttons in CFO scenarios)
- For non-dashboard assets: evaluate presence of any interactive elements, expandable sections, hover effects

${brandingContext}

Return ONLY valid JSON matching this schema:
{
  "overallScore": <0-100, higher = more layout variety>,
  "brandingScore": <0-100, how well assets match company branding>,
  "storytellingScore": <0-100, higher = more narrative diversity and skill breadth>,
  "styleScore": <0-100, higher = more content flow and layout format variety>,
  "interactivityScore": <0-100, higher = more chart type diversity, filters, and interactive controls>,
  "pairwiseScores": [{"asset1": "<name>", "asset2": "<name>", "similarity": <0-100>}],
  "structuralPatterns": [{"assetName": "<name>", "dominantPattern": "<description>"}],
  "narrativePatterns": [{"assetName": "<name>", "narrativeAngle": "<e.g. strategic leader, data-driven analyst>"}],
  "contentFlowPatterns": [{"assetName": "<name>", "flowPattern": "<e.g. header → two-column-grid → metrics-cards → bullet-list>", "layoutType": "<e.g. two-column, single-column, sidebar, grid>"}],
  "recommendations": ["<string>"]
}`
        },
        {
          role: 'user',
          content: `Analyze these ${structuralSummaries.length} document structures:\n\n${structuralSummaries.map((s: any) => `### ${s.assetName}\n${s.structure}`).join('\n\n---\n\n')}`
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 4000,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`AI request failed (${resp.status}): ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();
    let content = data.choices?.[0]?.message?.content || '';

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse variability score from AI response');
      }
      result = JSON.parse(jsonMatch[0]);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Variability scoring error:', e);
    return new Response(JSON.stringify({ success: false, error: 'An internal error occurred' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
