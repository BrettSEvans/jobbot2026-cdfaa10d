import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Strip text content, keep structural HTML (tags, classes, layout containers)
    const structuralSummaries = assets.map((a: { assetName: string; html: string }) => {
      // Remove text nodes but keep tag structure
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

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a design analyst evaluating structural and visual diversity across a set of HTML documents generated for the same job application. 

Evaluate:
1. Layout diversity — do documents use different layout patterns (tables, timelines, grids, cards, charts, lists)?
2. Visual structure variety — different header styles, section arrangements, color usage patterns?
3. Branding consistency — do all documents appropriately use the company's brand colors/fonts?
4. Structural uniqueness — for each pair of documents, how similar is their HTML tag hierarchy?

${brandingContext}

Return ONLY valid JSON matching this schema:
{
  "overallScore": <0-100, higher = more variety>,
  "brandingScore": <0-100, how well assets match company branding>,
  "pairwiseScores": [{"asset1": "<name>", "asset2": "<name>", "similarity": <0-100>}],
  "structuralPatterns": [{"assetName": "<name>", "dominantPattern": "<description>"}],
  "recommendations": ["<string>"]
}`
          },
          {
            role: 'user',
            content: `Analyze these ${structuralSummaries.length} document structures:\n\n${structuralSummaries.map((s: any) => `### ${s.assetName}\n${s.structure}`).join('\n\n---\n\n')}`
          },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`AI request failed (${resp.status}): ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();
    let content = data.choices?.[0]?.message?.content || '';

    // Extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse variability score from AI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Variability scoring error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
