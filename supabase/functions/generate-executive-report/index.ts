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

    const systemPrompt = `You are an elite, highly experienced ${jobTitle || 'senior leader'} who specializes in executive communication. You distill complex technical implementations into actionable, strategic insights for C-suite leaders and stakeholders.

You must create a highly realistic, customized 1-page Executive Status Report for a strategic project that ${companyName || 'the company'} would realistically execute right now.

COMPANY CONTEXT:
- Company: ${companyName || 'Unknown'}
- Role: ${jobTitle || 'Unknown'}
- Department: ${department || 'Unknown'}
- Products: ${(products || []).join(', ') || 'N/A'}
- Competitors: ${(competitors || []).join(', ') || 'N/A'}
- Customers: ${(customers || []).join(', ') || 'N/A'}

OUTPUT FORMAT: Clean, self-contained HTML with modern inline CSS styling. Use these brand colors where appropriate:
- Primary: ${primaryColor}
- Accent: ${accentColor}

REQUIRED SECTIONS:
1. **Header**: Project Name, Date (use today's date), Overall Health Status (Green/Yellow/Red indicator), Target Launch Date
2. **Executive Summary**: 3-4 sentences — recent milestones achieved + overarching business value
3. **Key Milestones**: Status table with 3-4 major deliverables (columns: Deliverable, Status, Owner, Target Date)
4. **Top Risks/Blockers**: 2 critical technical or cross-functional blockers with assigned "Asks" from leadership

STYLE REQUIREMENTS:
- Professional, clean layout with subtle borders and spacing
- Status indicators: Green (#22c55e), Yellow (#eab308), Red (#ef4444)
- Use a clean sans-serif font stack (system-ui, -apple-system, sans-serif)
- Responsive layout that looks good at any width
- Print-friendly (single page)
- Include a subtle header bar with the company name and project title

TONE: Crisp, authoritative, objective. Focused on business impact and technical velocity. No fluff.

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
