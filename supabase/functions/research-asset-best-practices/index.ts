import { errorResponse } from "../_shared/errorResponse.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiFetchWithRetry } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function normalizeAssetType(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { asset_type } = await req.json();
    if (!asset_type) {
      return new Response(JSON.stringify({ error: 'asset_type is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const normalized = normalizeAssetType(asset_type);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Check cache
    const { data: cached } = await supabaseAdmin
      .from('asset_best_practices')
      .select('*')
      .eq('asset_type', normalized)
      .maybeSingle();

    if (cached && cached.updated_at > thirtyDaysAgo) {
      return new Response(JSON.stringify({
        success: true,
        best_practices: cached.best_practices,
        winning_patterns: cached.winning_patterns,
        cached: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Research via AI — strict one-page rubric format
    const researchResp = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `You are a document design consultant who specializes in ONE-PAGE professional deliverables that fit on a single US Letter page (8.5×11in). You produce compact, constraint-driven rubrics — NOT verbose essays.` },
        { role: 'user', content: `Create a ONE-PAGE GENERATION RUBRIC for a "${asset_type}" document in a professional job context.

Output EXACTLY this format (keep each line short):

SECTIONS (max 3):
- [section name]: [1-sentence purpose, max 15 words]

CONTENT BUDGET:
- Header: max 2 lines (title + subtitle)
- Per section: max 3-4 bullets OR 1 short paragraph (2 sentences, 50 words max)
- Table rows: max 3-4 if used
- Footer: max 1 line

ALLOWED LAYOUTS (pick ONE per document):
- Single-column with section headers
- Two-column 60/40 split
- Compact table + bullet sections
- Metric cards row + body sections

BANNED PATTERNS:
- Kanban boards, swimlanes, multi-panel dashboards
- Nested grids deeper than 1 level
- Absolute/fixed positioning on any element
- Dense infographics or complex SVG charts
- More than 3 body sections
- Paragraphs longer than 2 sentences
- Framed/boxed section containers (use simple headers with underlines)

VISUAL RULES:
- Font: 9-10pt body, 11-13pt headings, 8pt footer
- Spacing: 0.15in between sections minimum
- Page fill target: 80-85% (look complete but not cramped)
- One optional simple data element (progress bars, small table, or 3-4 metric cards)

WHAT MAKES IT GREAT (max 3 bullets):
- [quality indicator]

COMMON MISTAKES (max 3 bullets):
- [mistake to avoid]

Keep the entire rubric under 250 words. Be specific to "${asset_type}" but stay compact.` },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    let bestPracticesText = '';
    if (researchResp.ok) {
      const rd = await researchResp.json();
      bestPracticesText = rd.choices?.[0]?.message?.content || '';
    }

    // Analyze download signals for winning patterns
    let winningPatterns: any = {};
    const { data: signals } = await supabaseAdmin
      .from('asset_download_signals')
      .select('application_id')
      .eq('asset_type', normalized)
      .order('created_at', { ascending: false })
      .limit(10);

    if (signals && signals.length >= 5) {
      const appIds = [...new Set(signals.map((s: any) => s.application_id))];
      const { data: assets } = await supabaseAdmin
        .from('generated_assets')
        .select('html')
        .in('application_id', appIds)
        .not('html', 'eq', '')
        .limit(10);

      if (assets && assets.length >= 3) {
        const samples = assets.map((a: any) => a.html.slice(0, 1500)).join('\n---SAMPLE---\n');
        const patternResp = await aiFetchWithRetry(LOVABLE_API_KEY, {
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Extract simple layout patterns from downloaded HTML documents. Prefer simple patterns. Return JSON only.' },
            { role: 'user', content: `These "${asset_type}" documents were downloaded (approval signal). Extract SIMPLE patterns only:\n${samples}\n\nReturn JSON: { "common_sections": ["section1","section2","section3"], "layout_approach": "single-column|two-column|table-based", "content_density": "low|medium", "visual_element": "none|progress-bars|metric-cards|small-table" }` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 800,
        });
        if (patternResp.ok) {
          const pd = await patternResp.json();
          const content = pd.choices?.[0]?.message?.content || '';
          try {
            winningPatterns = JSON.parse(content);
          } catch {
            const m = content.match(/\{[\s\S]*\}/);
            if (m) winningPatterns = JSON.parse(m[0]);
          }
        }
      }
    }

    // Upsert
    await supabaseAdmin.from('asset_best_practices').upsert({
      asset_type: normalized,
      best_practices: bestPracticesText,
      winning_patterns: winningPatterns,
      sample_count: signals?.length || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'asset_type' });

    return new Response(JSON.stringify({
      success: true,
      best_practices: bestPracticesText,
      winning_patterns: winningPatterns,
      cached: false,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Research error:', e);
    return new Response(JSON.stringify({ success: false, error: 'An internal error occurred' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
