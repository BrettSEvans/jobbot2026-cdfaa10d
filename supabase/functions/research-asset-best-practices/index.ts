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

    // Research via AI
    const researchResp = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert consultant researching best practices for professional documents.' },
        { role: 'user', content: `Research best practices for creating an excellent "${asset_type}" document in a professional job context. Cover structure, content, visual design, and common mistakes. Be specific.` },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    let bestPracticesText = '';
    if (researchResp.ok) {
      const rd = await researchResp.json();
      bestPracticesText = rd.choices?.[0]?.message?.content || '';
    }

    // Analyze download signals
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
        const samples = assets.map((a: any) => a.html.slice(0, 2000)).join('\n---SAMPLE---\n');
        const patternResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Analyze HTML document samples and extract common patterns. Return JSON only.' },
              { role: 'user', content: `These "${asset_type}" documents were downloaded (approval signal). Extract patterns:\n${samples}\n\nReturn JSON: { "common_sections": [], "visual_patterns": [], "content_patterns": [], "layout_approach": "" }` },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 2000,
          }),
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
