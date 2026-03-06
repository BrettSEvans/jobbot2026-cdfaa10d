import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TIER_LIMITS: Record<string, { perHour: number; perDay: number }> = {
  free: { perHour: 5, perDay: 15 },
  pro: { perHour: 20, perDay: 100 },
  premium: { perHour: 50, perDay: 250 },
};
const DEFAULT_LIMITS = TIER_LIMITS.free;
async function checkRateLimit(req: Request, assetType: string, edgeFunction: string): Promise<Response | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = data?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: override } = await svc.from('rate_limit_overrides').select('is_unlimited, per_hour, per_day').eq('user_id', userId).maybeSingle();
    if (override?.is_unlimited) {
      await svc.from('generation_usage').insert({ user_id: userId, asset_type: assetType, edge_function: edgeFunction });
      return null;
    }
    const { data: sub } = await svc.from('user_subscriptions').select('tier').eq('user_id', userId).maybeSingle();
    const tier = (sub?.tier as string) || 'free';
    const tierDefaults = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const limits = { perHour: override?.per_hour ?? tierDefaults.perHour, perDay: override?.per_day ?? tierDefaults.perDay };
    const now = Date.now();
    const { count: hourCount } = await svc.from('generation_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 3600_000).toISOString());
    const { count: dayCount } = await svc.from('generation_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 86400_000).toISOString());
    if ((hourCount ?? 0) >= limits.perHour || (dayCount ?? 0) >= limits.perDay) {
      const upgradeHint = tier !== 'premium' ? ` Upgrade to ${tier === 'free' ? 'Pro' : 'Premium'} for higher limits.` : '';
      return new Response(JSON.stringify({ error: `Rate limit exceeded.${upgradeHint}`, retry_after_seconds: 60, tier }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await svc.from('generation_usage').insert({ user_id: userId, asset_type: assetType, edge_function: edgeFunction });
  } catch (e) { console.warn('Rate limit check failed, allowing request:', e); }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const rateLimitResponse = await checkRateLimit(req, 'raid-log', 'refine-raid-log');
    if (rateLimitResponse) return rateLimitResponse;

    const { currentHtml, userMessage, jobDescription, companyName, jobTitle, branding, styleContext } = await req.json();
    if (!userMessage) {
      return new Response(JSON.stringify({ error: 'User message is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `You are an expert Technical Program Manager specializing in RAID Log management. You are refining an existing RAID Log based on user feedback.
${styleContext || ''}

RULES:
- Output the COMPLETE modified HTML file, starting with <!DOCTYPE html> and ending with </html>
- Keep all existing entries unless explicitly asked to change them
- Maintain the self-contained nature (all CSS embedded inline)
- Apply the requested changes precisely
- Do NOT add explanations — output ONLY the HTML

STYLE SIGNAL DETECTION:
If the user's feedback implies a general style preference, after the HTML output, add a JSON block:
\`\`\`json
{"style_signals":[{"category":"tone|length|formatting|emphasis|vocabulary|structure","preference":"...","confidence":0.7,"source_quote":"user's words"}]}
\`\`\`
Only flag GENERAL preferences. If none detected, omit this block.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the current RAID Log HTML:\n\n${currentHtml}\n\n---\n\nPlease make this modification: ${userMessage}` },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-3-flash-preview', messages, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limited. Please try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI refinement failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
  } catch (e) {
    console.error('Refine RAID log error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
