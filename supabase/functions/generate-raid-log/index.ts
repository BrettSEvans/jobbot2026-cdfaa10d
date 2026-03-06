import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TIER_LIMITS: Record<string, { perHour: number; perDay: number }> = {
  free: { perHour: 5, perDay: 15 },
  pro: { perHour: -1, perDay: 100 },
  premium: { perHour: -1, perDay: 250 },
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
    if ((limits.perHour !== -1 && (hourCount ?? 0) >= limits.perHour) || (limits.perDay !== -1 && (dayCount ?? 0) >= limits.perDay)) {
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
    const rateLimitResponse = await checkRateLimit(req, 'raid-log', 'generate-raid-log');
    if (rateLimitResponse) return rateLimitResponse;

    const { jobDescription, companyName, jobTitle, competitors, customers, products, department, branding } = await req.json();

    if (!jobDescription) {
      return new Response(
        JSON.stringify({ error: 'Job description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brandColors = branding?.colors || {};
    const primaryColor = brandColors.primary || '#1a365d';
    const accentColor = brandColors.secondary || brandColors.accent || '#2563eb';

    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `You are a meticulous, forward-thinking Technical Program Manager. Your superpower is anticipating bottlenecks, documenting dependencies across complex engineering pods, and maintaining flawless operational rigor.

You must create a realistic, robust RAID Log (Risks, Assumptions, Issues, Dependencies) for a complex, cross-functional initiative that aligns directly with ${companyName || 'the company'}'s current goals and the specific technical challenges in the job description.

COMPANY CONTEXT:
- Company: ${companyName || 'Unknown'}
- Role: ${jobTitle || 'Unknown'}
- Department: ${department || 'Unknown'}
- Products: ${(products || []).join(', ') || 'N/A'}
- Competitors: ${(competitors || []).join(', ') || 'N/A'}
- Customers: ${(customers || []).join(', ') || 'N/A'}

OUTPUT FORMAT: Responsive, self-contained HTML with professional inline CSS. Use these brand colors:
- Primary: ${primaryColor}
- Accent: ${accentColor}

REQUIRED STRUCTURE:
1. **Header**: Project title (realistic initiative for this company), Date, RAID Log label
2. **Four distinct sections** each as a styled HTML table:
   - **Risks** (3-4 entries)
   - **Assumptions** (3-4 entries)
   - **Issues** (2-3 entries)
   - **Dependencies** (3-4 entries)
3. **Columns for each entry**: ID, Description, Impact (High/Med/Low with color-coded badges), Owner (realistic role titles), Status (Open/Mitigated/Closed with badges), Mitigation Strategy, Updated

STYLE REQUIREMENTS:
- Clean sans-serif font stack (system-ui, -apple-system, sans-serif)
- Subtle row striping (alternating row backgrounds)
- Color-coded impact badges: High (#ef4444 bg), Med (#eab308 bg), Low (#22c55e bg)
- Color-coded status badges: Open (#ef4444), Mitigated (#eab308), Closed (#22c55e)
- Responsive tables that work at any width
- Print-friendly single-page layout
- Professional header bar with company name and project title
- Each section (R, A, I, D) should have a clear section header

CONTENT REQUIREMENTS:
- Technical details must sound authentic to ${companyName || 'the company'}'s industry and tech stack
- Include realistic API limits, cloud migration dependencies, security compliance items
- Owners should be realistic role titles (VP Engineering, Staff SRE, Security Lead, etc.)
- Mitigation strategies should be specific and actionable

DATE REALISM (CRITICAL):
- Today's date is ${currentDate}.
- Every entry MUST include an "Updated" column.
- Each "Updated" date must fall within the 14 calendar days PRIOR to today.
- Vary the dates naturally across entries — do NOT use the same date for all rows.
- Use a human-readable format (e.g., "Feb 27, 2026").
- More urgent items (High impact, Open status) should have more recent Updated dates.

TONE: Analytical, precise, and proactive.

Output ONLY the complete HTML document. No markdown fences, no explanations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate a RAID Log for this role and company.\n\nJob Description:\n${jobDescription}`
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
    console.error('RAID log error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
