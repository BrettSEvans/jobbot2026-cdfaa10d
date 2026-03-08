import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function logUsage(req: Request, assetType: string, edgeFunction: string): Promise<Response | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = data?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await svc.from('generation_usage').insert({ user_id: userId, asset_type: assetType, edge_function: edgeFunction });
  } catch (e) { console.warn('Usage logging failed, allowing request:', e); }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rateLimitResponse = await checkRateLimit(req, 'resume', 'generate-resume');
    if (rateLimitResponse) return rateLimitResponse;

    const {
      jobDescription, resumeText, systemPrompt, companyName, jobTitle,
      branding, competitors, customers, products, profileContext, generationGuide,
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
    const basePrompt = systemPrompt || `You are an expert resume tailor. Your job is to take the candidate's EXISTING resume and adapt it to better match a target job description — WITHOUT fabricating any experience, skills, degrees, or achievements the candidate does not already have.`;

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

YOUR PROCESS:
1. SCAN the job description to identify crucial skills, responsibilities, qualifications, and keywords the employer values.
2. MAP the candidate's existing experience, skills, and achievements from their baseline resume onto the job requirements.
3. REWRITE bullet points to emphasize relevant achievements using strong action verbs and keywords from the job description — but ONLY using facts already present in the candidate's resume.
4. REORDER sections and bullet points so the most relevant experience appears first.
5. FORMAT for ATS compatibility: clean structure, standard section headings (Experience, Education, Skills), no tables/columns/graphics, standard fonts.

CRITICAL RULES:
1. Output ONLY a complete, self-contained HTML document. No markdown fences, no explanations.
2. NEVER invent, fabricate, or embellish experience, job titles, companies, degrees, certifications, or skills the candidate does not have.
3. You MAY rephrase, reframe, and re-prioritize existing experience to better align with the job description.
4. You MAY incorporate relevant keywords from the job description into existing bullet points where they truthfully apply.
5. You MAY de-emphasize or omit irrelevant positions to make room for relevant ones.
6. Quantify achievements wherever possible using numbers already present in the resume (%, $, team sizes).
7. The HTML must be print-friendly and fit on exactly ONE standard letter page (use @media print, size: letter, appropriate margins and font sizes).
8. Use subtle brand colors if available: primary ${primaryColor}, secondary ${secondaryColor}.
9. Use Google Fonts via @import for professional typography.
10. All CSS must be embedded inline in a <style> tag.
11. Replace any placeholder names with the candidate's actual name from the profile context or resume.
12. If the candidate's resume text is missing or empty, state that you cannot generate a tailored resume without baseline data — do NOT make up a resume.
${profileContext ? `\nCANDIDATE PROFILE CONTEXT:\n${profileContext}` : ''}
${generationGuide ? `\n${generationGuide}` : ''}`;

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
