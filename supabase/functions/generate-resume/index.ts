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
    const {
      jobDescription, resumeText, systemPrompt, companyName, jobTitle,
      branding, competitors, customers, products, profileContext,
    } = await req.json();

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

    // Use the admin-configured system prompt, or fall back to a default
    const basePrompt = systemPrompt || `You are an expert resume writer. Create a professional, ATS-optimized resume in HTML format that fits on exactly one printed page.`;

    const brandColors = branding?.colors || {};
    const primaryColor = brandColors.primary || brandColors['dominant-1'] || '#1a365d';
    const secondaryColor = brandColors.secondary || brandColors['dominant-2'] || '#2563eb';

    const fullSystemPrompt = `${basePrompt}

COMPANY CONTEXT:
- Company: ${companyName || 'Unknown'}
- Role: ${jobTitle || 'Unknown'}
- Products: ${(products || []).join(', ') || 'N/A'}
- Competitors: ${(competitors || []).join(', ') || 'N/A'}
- Customers: ${(customers || []).join(', ') || 'N/A'}

CRITICAL RULES:
1. Output ONLY a complete, self-contained HTML document. No markdown fences, no explanations.
2. The resume MUST be optimized for the specific job description provided — tailor every bullet point.
3. Use the candidate's actual experience and skills from their resume text, but reframe and prioritize them for the target role.
4. Include only relevant experience; omit or minimize irrelevant positions.
5. Quantify achievements wherever possible (%, $, team sizes).
6. The HTML must be print-friendly and fit on exactly ONE standard letter page (use @media print, size: letter, appropriate margins and font sizes).
7. Use subtle brand colors if available: primary ${primaryColor}, secondary ${secondaryColor}.
8. Use Google Fonts via @import for professional typography.
9. All CSS must be embedded inline in a <style> tag.
10. Replace any placeholder names with the candidate's actual name from the profile context.
${profileContext ? `\nCANDIDATE PROFILE CONTEXT:\n${profileContext}` : ''}`;

    const userContent = `Generate a tailored resume for this position.

CANDIDATE'S BASELINE RESUME:
${resumeText || '(No baseline resume provided — create a compelling resume based on the job description and profile context)'}

TARGET JOB DESCRIPTION:
${jobDescription}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: userContent },
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
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
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
    console.error('Resume generation error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
