import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_COVER_LETTER = `To the Gusto GTM Team,

I am excitedly applying for the Head of GTM Process & Tooling position at Gusto. While my previous background spans sales, operations and program management, my true "geek out" passion, and common thread through my career, lies in building the internal systems, AI-driven tools, and streamlined processes that empower teams to excel. I am particularly excited about Gusto's commitment to making complex business tasks simple and personal—a philosophy I apply to the internal tools I build for my own colleagues.

At Gusto, I envision my role as a bridge between data and execution. I want to work alongside the GTM team and stakeholders to create an evolving ecosystem of automated agents and intelligence tools that help our reps exceed their quotas. I believe we are at a tipping point where AI tools allow us to transition from "knowledge workers" to "judgment workers," and I have already begun prototyping how this looks in a GTM environment.

As a demonstration of my vision for Gusto's GTM path, I have developed a functioning mock-up of a Business Intelligence Dashboard. This dashboard represents the "Intel Officer" approach—arming the team with technical ammunition and competitive counters in real-time. Beyond dashboards, I would work with the team and stakeholders/partners to build "Agentic Staff"—automated workflows that act as a force multiplier for the team.

I realize that even the most advanced AI agents and dashboards are simply "arrows in the quiver". The GTM team members are the ones who actually hit the target. My goal is to provide them with vetted, useful tools that eliminate manual friction, allowing them to focus entirely on the hard work of winning business and helping small businesses thrive.

I am eager to see if my vision for interconnected agents and AI-driven operations integrates with the path the Gusto team has already forged.

Sincerely,
Brett Evans`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, customInstructions } = await req.json();

    if (!jobDescription) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job description is required' }),
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

    const systemPrompt = `You are an expert cover letter writer. You will be given Brett Evans' base cover letter and a job description. Your task is to lightly tailor the cover letter to match the job.

CRITICAL Rules:
- You MUST replace EVERY instance of "Gusto" with the actual company name from the job posting. The base letter uses "Gusto" as a placeholder — it is NOT the target company unless the job posting is literally for Gusto.
- You MUST replace the role title ("Head of GTM Process & Tooling") with the actual role title from the job posting.
- You MUST replace the greeting ("To the Gusto GTM Team") with an appropriate greeting for the target company and team.
- Adjust 2-3 talking points to align with the job's key requirements
- Keep Brett's core narrative, tone, and experience intact
- Maintain the same general structure and length
- Keep the letter professional but enthusiastic
- Do NOT invent new experiences — only reframe existing ones
- Output ONLY the tailored cover letter text, no explanations or metadata
${customInstructions ? `\nAdditional instructions from Brett: ${customInstructions}` : ''}`;

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
            content: `Here is my base cover letter:\n\n${BASE_COVER_LETTER}\n\n---\n\nHere is the job posting I'm applying to:\n\n${jobDescription}`
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
    console.error('Tailor error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
