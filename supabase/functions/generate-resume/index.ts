const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, resumeText, missingKeywords, userPrompt, companyName, jobTitle, jdIntelligence } = await req.json();

    if (!jobDescription || jobDescription.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job description too short' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Resume text is required. Upload a resume in your Profile first.' }),
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

    const keywordList = (missingKeywords || []).map((k: any) => typeof k === 'string' ? k : k.keyword);
    const criticalKws = (missingKeywords || []).filter((k: any) => k.importance === 'critical').map((k: any) => typeof k === 'string' ? k : k.keyword);
    const preferredKws = (missingKeywords || []).filter((k: any) => k.importance === 'preferred').map((k: any) => typeof k === 'string' ? k : k.keyword);

    const systemPrompt = `You are an expert HR resume writer specializing in ATS optimization. Your task is to rewrite the candidate's resume to maximize keyword match with the target job description while maintaining truthfulness.

OUTPUT FORMAT:
Return a single-page, ATS-optimized resume as clean semantic HTML. Use this structure:
- Single column layout (NO tables, NO multi-column CSS, NO floats)
- Standard sections: Contact Info, Professional Summary, Skills, Experience, Education
- Use <h1> for candidate name, <h2> for section headings
- Use <ul>/<li> for bullet points in experience
- Inline styles only (no <style> blocks) for basic formatting (font-family: Arial, sans-serif; font-size: 11pt)

KEYWORD INJECTION RULES:
${criticalKws.length > 0 ? `CRITICAL keywords (MUST appear): ${criticalKws.join(', ')}` : 'No critical keywords specified.'}
${preferredKws.length > 0 ? `PREFERRED keywords (should appear): ${preferredKws.join(', ')}` : ''}
${keywordList.length > 0 ? `\nAll target keywords: ${keywordList.join(', ')}` : ''}

STRATEGY:
1. Add a "Core Competencies" or "Technical Skills" section near the top listing exact-match keywords from the JD
2. Weave keywords naturally into experience bullet points using the XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]"
3. Mirror the JD's exact terminology (e.g., if JD says "Kubernetes" don't write "K8s")
4. Reorder sections to prioritize what the JD emphasizes most
5. Allocate more detail to the two most recent roles; condense older experience
6. Include a 3-line professional summary mirroring the target job title and top requirements

ABSOLUTE RULES:
- NEVER invent skills, certifications, degrees, or job titles the candidate doesn't have
- NEVER fabricate metrics or achievements — only quantify what the candidate already states
- If a missing keyword relates to a skill the candidate doesn't have, DO NOT add it to experience bullets — only list it in skills if it's adjacent to their actual expertise
- Preserve all dates, company names, and job titles exactly as provided
- Keep to one page equivalent (~600-800 words)
${userPrompt ? `\nUSER CONTEXT (use this to inform keyword placement):\n${userPrompt}` : ''}`;

    // Enhance prompt with JD intelligence if available
    let jdInjection = '';
    if (jdIntelligence) {
      const mustHaveReqs = (jdIntelligence.requirements || []).filter((r: any) => r.category === 'must_have').map((r: any) => r.text);
      const tier1Kws = (jdIntelligence.ats_keywords || []).filter((k: any) => k.tier === 1).map((k: any) => k.keyword);
      const tier2Kws = (jdIntelligence.ats_keywords || []).filter((k: any) => k.tier === 2).map((k: any) => k.keyword);
      const seniority = jdIntelligence.seniority;
      const jobFunc = jdIntelligence.job_function || '';

      jdInjection = `\n\nJD INTELLIGENCE (structured analysis):`;
      if (tier1Kws.length > 0) jdInjection += `\nMUST-MIRROR KEYWORDS (Tier 1): ${tier1Kws.join(', ')}`;
      if (tier2Kws.length > 0) jdInjection += `\nPREFERRED KEYWORDS (Tier 2): ${tier2Kws.join(', ')}`;
      if (mustHaveReqs.length > 0) jdInjection += `\nMUST-HAVE REQUIREMENTS: ${mustHaveReqs.slice(0, 10).join('; ')}`;
      if (seniority) {
        jdInjection += `\nSENIORITY: ${seniority.level} (${seniority.management_scope})`;
        if (['senior', 'staff', 'principal', 'director', 'vp', 'c_suite'].includes(seniority.level)) {
          jdInjection += ' → emphasize leadership, architecture, and strategic impact';
        } else if (seniority.level === 'mid') {
          jdInjection += ' → emphasize technical depth and growing scope';
        } else {
          jdInjection += ' → emphasize learning velocity and eagerness';
        }
      }
      if (jobFunc) {
        const sectionOrders: Record<string, string> = {
          engineering: 'Summary → Skills → Experience → Projects → Education',
          sales: 'Summary → Achievements → Experience → Skills → Education',
          product: 'Summary → Experience → Skills → Certs → Education',
          marketing: 'Summary → Campaigns → Experience → Skills → Education',
        };
        const order = sectionOrders[jobFunc] || sectionOrders.engineering;
        jdInjection += `\nSECTION ORDER (${jobFunc}): ${order}`;
      }
    }

    const fullSystemPrompt = systemPrompt + jdInjection;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          {
            role: 'user',
            content: `Target Job: ${jobTitle || 'Not specified'} at ${companyName || 'Not specified'}

JOB DESCRIPTION:
${jobDescription.slice(0, 8000)}

CANDIDATE'S CURRENT RESUME:
${resumeText.slice(0, 8000)}

Generate the optimized resume HTML now. Return ONLY the HTML content, no markdown fences or explanations.`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limited — try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errText = await response.text();
      throw new Error(`AI request failed (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    let resumeHtml = data.choices?.[0]?.message?.content || '';

    // Clean markdown fences if present
    resumeHtml = resumeHtml.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

    if (!resumeHtml || resumeHtml.length < 100) {
      throw new Error('Generated resume was empty or too short');
    }

    return new Response(
      JSON.stringify({
        success: true,
        resume_html: resumeHtml,
        keywords_injected: keywordList,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Resume generation error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
