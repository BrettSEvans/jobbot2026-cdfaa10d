import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_LIMITS = { perHour: 20, perDay: 100 };
async function checkRateLimit(req: Request, assetType: string, edgeFunction: string): Promise<Response | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = data?.claims?.sub;
    if (!userId) return null;
    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: override } = await svc.from('rate_limit_overrides').select('is_unlimited, per_hour, per_day').eq('user_id', userId).maybeSingle();
    if (override?.is_unlimited) {
      await svc.from('generation_usage').insert({ user_id: userId, asset_type: assetType, edge_function: edgeFunction });
      return null;
    }
    const limits = { perHour: override?.per_hour ?? DEFAULT_LIMITS.perHour, perDay: override?.per_day ?? DEFAULT_LIMITS.perDay };
    const now = Date.now();
    const { count: hourCount } = await svc.from('generation_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 3600_000).toISOString());
    const { count: dayCount } = await svc.from('generation_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 86400_000).toISOString());
    if ((hourCount ?? 0) >= limits.perHour || (dayCount ?? 0) >= limits.perDay) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', retry_after_seconds: 60 }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
    const rateLimitResponse = await checkRateLimit(req, 'roadmap', 'generate-roadmap');
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
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
    const currentYear = now.getFullYear();
    const startDate = now.toISOString().split('T')[0];

    const systemPrompt = `You are a strategic Program Manager who excels at driving alignment. You masterfully orchestrate multi-quarter delivery timelines, balancing technical debt resolution with aggressive product feature launches across multiple teams.

You must create a visual Cross-Functional Roadmap for a major strategic initiative relevant to ${companyName || 'the company'}'s business model and the role described in the job description.

COMPANY CONTEXT:
- Company: ${companyName || 'Unknown'}
- Role: ${jobTitle || 'Unknown'}
- Department: ${department || 'Unknown'}
- Products: ${(products || []).join(', ') || 'N/A'}
- Competitors: ${(competitors || []).join(', ') || 'N/A'}
- Customers: ${(customers || []).join(', ') || 'N/A'}

TIMELINE CONTEXT:
- Today's date is ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
- Start date: ${startDate}
- Starting quarter: Q${currentQuarter} ${currentYear}
- Span: 3 quarters (Q${currentQuarter} ${currentYear} through Q${((currentQuarter + 1) % 4) + 1} ${currentQuarter >= 3 ? currentYear + 1 : currentYear})
- All dates in the roadmap must be realistic relative to today. Do NOT use placeholder dates from a different year.

CRITICAL INSTRUCTIONS FOR DEPARTMENT SELECTION:
- Analyze the job title and description to determine the correct upstream and downstream departments.
- For a TPM role: Engineering, Product, Design, QA, DevOps, Security
- For a GTM role: Product Marketing, Marketing, Sales, Customer Success, Revenue Operations
- For a PM role: Engineering, Design, Data/Analytics, QA, GTM
- For other roles: Research the most relevant cross-functional departments based on the JD
- Include 4-6 department swimlanes

OUTPUT FORMAT: A single, self-contained HTML file. Use CSS Grid or Flexbox to construct a visual Gantt chart timeline. Use these brand colors:
- Primary: ${primaryColor}
- Accent: ${accentColor}

REQUIRED STRUCTURE:
1. **Header**: Initiative title (realistic for this company), date range, role context
2. **Timeline Header**: Show months across 3 quarters with clear quarter labels
3. **Swimlanes**: Horizontal rows for each department/team
4. **Timeline Bars**: Colored, rounded horizontal bars spanning the timeline grid representing specific milestones
5. **Dependency Lines**: At least 2 visible dependency connections between swimlanes (use SVG lines or CSS borders to show "Backend API must complete before Frontend can build UI" type relationships)
6. **Legend**: Color-coded legend for bar types (Feature, Infrastructure, Milestone, Dependency)

CONTENT REQUIREMENTS:
- Roadmap items must directly reflect the scope of work described in the JD
- Include realistic initiative names (e.g., "Legacy API Deprecation," "User Auth V2 Launch", "Data Pipeline Migration")
- Each swimlane should have 3-5 work items
- Show overlapping work items where realistic
- Include at least one critical path highlighted in a distinct color
- Mark key milestones with diamond or star markers

STYLE REQUIREMENTS:
- Modern, professional design with the brand color palette
- Clean sans-serif font stack (system-ui, -apple-system, sans-serif)
- Subtle grid lines for the timeline
- Hover tooltips on bars showing details
- Responsive layout that works at different widths
- Use inline SVG for any icons or dependency arrows (no external images)
- Dark text on light backgrounds for readability
- Each department swimlane should have a distinct but harmonious color derived from the brand palette

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
            content: `Generate a Cross-Functional Roadmap for this role and company.\n\nJob Description:\n${jobDescription}`
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
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
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
    console.error('Roadmap error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
