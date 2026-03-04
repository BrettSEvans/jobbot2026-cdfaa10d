import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RATE_LIMITS = { perHour: 20, perDay: 100 };
async function checkRateLimit(req: Request, assetType: string, edgeFunction: string): Promise<Response | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = data?.claims?.sub;
    if (!userId) return null;
    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const now = Date.now();
    const { count: hourCount } = await svc.from('generation_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 3600_000).toISOString());
    const { count: dayCount } = await svc.from('generation_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 86400_000).toISOString());
    if ((hourCount ?? 0) >= RATE_LIMITS.perHour || (dayCount ?? 0) >= RATE_LIMITS.perDay) {
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
    const rateLimitResponse = await checkRateLimit(req, 'executive-report', 'generate-executive-report');
    if (rateLimitResponse) return rateLimitResponse;

    const { jobDescription, companyName, jobTitle, competitors, customers, products, department, branding, profileContext } = await req.json();

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
    const brandFonts = branding?.fonts || branding?.typography?.fontFamilies || {};
    const primaryColor = brandColors.primary || brandColors['dominant-1'] || '#1a365d';
    const secondaryColor = brandColors.secondary || brandColors['dominant-2'] || '#2563eb';
    const accentColor = brandColors.accent || brandColors['dominant-3'] || secondaryColor;
    const bgColor = brandColors.background || brandColors['dominant-4'] || '#ffffff';
    const textColor = brandColors.textPrimary || brandColors['dominant-5'] || '#1a1a1a';
    const textSecondary = brandColors.textSecondary || '#555555';
    const primaryFont = brandFonts.primary || brandFonts.heading || (branding?.fonts?.[0]?.family) || '';
    const bodyFont = brandFonts.body || brandFonts.primary || (branding?.fonts?.[1]?.family || branding?.fonts?.[0]?.family) || '';

    // Build a palette string from ALL available extracted colors for the AI to use
    const allColorEntries = Object.entries(brandColors).filter(([, v]) => v && typeof v === 'string');
    const extractedColors = branding?.extractedColors ? Object.entries(branding.extractedColors) : [];
    const fullPalette = [...allColorEntries, ...extractedColors].map(([k, v]) => `  ${k}: ${v}`).join('\n');

    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const systemPrompt = `You are an elite, highly experienced ${jobTitle || 'senior leader'} who specializes in executive communication. You distill complex technical implementations into actionable, strategic insights for C-suite leaders and stakeholders.

You must create a highly realistic, customized 1-page Executive Status Report for a strategic project that ${companyName || 'the company'} would realistically execute right now.

COMPANY CONTEXT:
- Company: ${companyName || 'Unknown'}
- Role: ${jobTitle || 'Unknown'}
- Department: ${department || 'Unknown'}
- Products: ${(products || []).join(', ') || 'N/A'}
- Competitors: ${(competitors || []).join(', ') || 'N/A'}
- Customers: ${(customers || []).join(', ') || 'N/A'}

BRANDING (CRITICAL — follow precisely):
The report MUST look like an internal document produced by ${companyName || 'the company'}. Apply these brand colors and fonts aggressively throughout the entire document:

Primary brand color: ${primaryColor}
Secondary brand color: ${secondaryColor}
Accent color: ${accentColor}
Background: ${bgColor}
Text primary: ${textColor}
Text secondary: ${textSecondary}
${primaryFont ? `Heading font: "${primaryFont}"` : ''}
${bodyFont ? `Body font: "${bodyFont}"` : ''}

Full extracted color palette:
${fullPalette || '  (none available — use the primary/secondary/accent above)'}

BRANDING APPLICATION RULES:
1. **Header bar**: Use the PRIMARY brand color as a solid background for the top header/banner. Text on it should be white or a contrasting light color. The header should feel bold and unmistakably branded.
2. **Section headers / subheadings**: Use the primary or secondary brand color for section heading text or as a left-border accent.
3. **Table header rows**: Use the primary brand color as background with white text.
4. **Alternating row shading**: Use a very light tint of the primary brand color (e.g. primary at 5-10% opacity) for alternating table rows.
5. **Card/block backgrounds**: Use light tints of the brand colors for content cards, callout boxes, and summary blocks — NOT plain white or gray.
6. **Status pill backgrounds**: Use tinted brand colors for status indicators where appropriate (green/yellow/red for RAG, but style the pill shape using brand radius/fonts).
7. **Borders and dividers**: Use the secondary or accent brand color for horizontal rules, card borders, and table borders.
8. **Fonts**: If brand fonts are provided, use them via Google Fonts @import or as the first choice in font-family stacks. Fall back to system-ui, sans-serif.
9. **Overall page background**: If the brand has a dark color scheme, consider a subtle dark background. Otherwise, use white or a very subtle tint of the brand palette.
10. The document should be IMMEDIATELY recognizable as a ${companyName || 'company'}-branded artifact — not a generic template with one accent color.

DATE REALISM (CRITICAL):
- Today's date is ${currentDate}. Use this as the report date / "As of" date.
- Completed milestones should have dates within the 1-6 months prior to today.
- Upcoming milestones should have target dates 1-6 months in the future.
- Next review / follow-up dates should be 1-2 weeks after today.
- Sprint or iteration dates should align with a realistic 2-week cadence around today.

REQUIRED SECTIONS:
1. **Header**: Project Name, Date (${currentDate}), Overall Health Status (Green/Yellow/Red indicator), Target Launch Date
2. **Executive Summary**: 3-4 sentences — recent milestones achieved + overarching business value
3. **Key Milestones**: Status table with 3-4 major deliverables (columns: Deliverable, Status, Owner, Target Date)
4. **Top Risks/Blockers**: 2 critical technical or cross-functional blockers with assigned "Asks" from leadership

STYLE REQUIREMENTS:
- Professional, clean layout with subtle borders and spacing
- Status indicators: Green (#22c55e), Yellow (#eab308), Red (#ef4444) — but styled to fit brand aesthetic
- Responsive layout that looks good at any width
- Print-friendly (single page)
- Include a bold header bar with the company name and project title using brand colors

TONE: Crisp, authoritative, objective. Focused on business impact and technical velocity. No fluff.
${profileContext ? `\n${profileContext}` : ''}
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
            content: `Generate an Executive Status Report for this role and company.\n\nJob Description:\n${jobDescription}`
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
    console.error('Executive report error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
