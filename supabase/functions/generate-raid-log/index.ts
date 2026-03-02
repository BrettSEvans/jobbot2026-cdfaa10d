import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
3. **Columns for each entry**: ID, Description, Impact (High/Med/Low with color-coded badges), Owner (realistic role titles), Status (Open/Mitigated/Closed with badges), Mitigation Strategy

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
