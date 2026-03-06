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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rateLimitResponse = await checkRateLimit(req, 'dashboard', 'refine-dashboard');
    if (rateLimitResponse) return rateLimitResponse;

    const { currentDashboardData, currentHtml, userMessage, chatHistory, styleContext } = await req.json();

    if (!userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: 'User message is required' }),
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

    // Use JSON-based refinement if we have structured data, otherwise fall back to HTML
    const useJsonMode = !!currentDashboardData;

    const systemPrompt = useJsonMode
      ? `You are an expert business intelligence data architect. You are refining a dashboard's structured JSON data based on user feedback.

OUTPUT: ONLY valid JSON. No markdown fences, no explanation. Start with { and end with }.

The JSON follows this schema:
{
  "meta": { "companyName", "jobTitle", "department", "logoUrl?" },
  "branding": { "primary", "onPrimary", "primaryContainer", "onPrimaryContainer", "secondary", "onSecondary", "surface", "onSurface", "surfaceVariant", "outline", "error", "fontHeading", "fontBody" },
  "navigation": [{ "id", "label", "icon" }],
  "sections": [{ "id", "title", "description", "metrics": [{ "label", "value", "change", "trend" }], "charts": [{ "id", "title", "type", "data": { "labels", "datasets" } }], "tables": [{ "id", "title", "columns", "generateRows" }] }],
  "agenticWorkforce": [{ "name", "coreFunctionality", "interfacingTeams" }],
  "cfoScenarios": [{ "id", "title", "description", "type", "sliders", "baseline", "quarters", "chartType" }]
}

RULES:
- Return the COMPLETE modified JSON object with the user's requested changes applied
- Keep all existing data unless explicitly asked to change it
- Maintain valid JSON structure at all times
- Apply changes precisely as requested
- Chart types: bar|line|doughnut|pie|radar|scatter|horizontalBar|area
- Table generateRows fields: personName|company|date|futureDate|currency|status|region|product|percent|integer|email|pick
- Ensure navigation includes "agentic-workforce" and "cfo-view" entries
${styleContext || ''}`
      : `You are an expert front-end developer helping refine a standalone HTML Business Intelligence Dashboard.

RULES:
- Output the COMPLETE modified HTML file, starting with <!DOCTYPE html> and ending with </html>
- Keep all existing functionality unless explicitly asked to change it
- Maintain the self-contained nature (all CSS/JS embedded)
- Preserve Chart.js charts and interactive elements
- Apply the requested changes precisely
- Do NOT add explanations — output ONLY the HTML
${styleContext || ''}`;

    const messages: Array<{role: string; content: string}> = [
      { role: 'system', content: systemPrompt },
    ];

    if (chatHistory?.length) {
      for (const msg of chatHistory.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const currentContent = useJsonMode
      ? JSON.stringify(currentDashboardData, null, 2)
      : currentHtml;

    messages.push({
      role: 'user',
      content: `Here is the current dashboard ${useJsonMode ? 'JSON data' : 'HTML'}:\n\n${currentContent}\n\n---\n\nPlease make this modification: ${userMessage}`
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages,
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
      return new Response(JSON.stringify({ error: 'AI refinement failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('Refine error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
