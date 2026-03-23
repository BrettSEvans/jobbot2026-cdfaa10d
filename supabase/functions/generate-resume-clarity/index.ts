import { aiFetchWithRetry } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, resumeText, companyName, jobTitle, jdIntelligence } = await req.json();

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

    // Determine if candidate is a recent graduate (< 3 years)
    // We'll let the AI infer from the resume data

    const systemPrompt = `You are an expert executive technical recruiter. Your objective is to rewrite the provided resume data to perfectly align with the target job description using a "Human-First" resume strategy. Do not optimize for Applicant Tracking System (ATS) algorithms or keyword density; optimize for clarity and impact so a human recruiter can skim the document in 5 seconds and immediately understand the candidate's value.

Context & Behavioral Constraints:

LAYOUT & FORMATTING:
- Keep the design clean and simple
- Use a single-column layout without tables, clip art, or graphics
- Use standard fonts: Arial, Calibri, or Times New Roman
- Apply bold text strategically for emphasis (company names, dates)
- Ensure bullet point punctuation is perfectly consistent throughout
- Output as clean semantic HTML with inline styles only (no <style> blocks)
- Use <h1> for candidate name, <h2> for section headings
- Use <ul>/<li> for bullet points in experience

HEADER INFORMATION:
- Include name, location, phone number, email address, LinkedIn URL, and any relevant portfolio links at the top

PROFESSIONAL SUMMARY:
- Only include a summary if the candidate's resume suggests they are explaining a layoff, relocation, or career transition
- If writing one, it must contain: 1) A clear statement of professional capacity, 2) A value proposition with evidence, 3) A supporting trait or memorable item, 4) Clear career goals
- Avoid generic language like "results-driven" or "good communicator"
- If no transition signals are detected, OMIT the summary entirely

EXPERIENCE SECTION - TITLE GAPS:
- If the candidate's past titles do not clearly translate to the target role, add a contextual clarifier in parentheses (e.g., "Product Manager (Functionally leading roadmap...)") to prevent disqualification

EXPERIENCE SECTION - THE SIZZLE:
- Do NOT list basic job expectations or duties
- Highlight outcomes and momentum using the Google XYZ formula ("Accomplished X as measured by Y by doing Z") or a "Claim-Evidence" approach
- Use specific numbers, dollar amounts, or percentages to show business impact
- Only quantify what the candidate already states — NEVER fabricate metrics

SKILL INTEGRATION:
- Embed core skills from the job description naturally into bullet points
- In the dedicated Skills section, list only tools and proficiencies explicitly relevant to the job posting

EDUCATION:
- Include institution, degree, and relevant coursework
- If the user graduated within the last 3 years, place Education at the top (below contact info) and include the graduation date
- If graduation was more than 3 years ago, place Education at the bottom and remove the dates

ABSOLUTE RULES:
- NEVER invent skills, certifications, degrees, or job titles the candidate doesn't have
- NEVER fabricate metrics or achievements
- Preserve all dates, company names, and job titles exactly as provided
- Keep to one page equivalent (~600-800 words)
- Proofread meticulously to ensure zero spelling mistakes`;

    let jdContext = '';
    if (jdIntelligence) {
      const mustHaveReqs = (jdIntelligence.requirements || []).filter((r: any) => r.category === 'must_have').map((r: any) => r.text);
      const seniority = jdIntelligence.seniority;

      jdContext = `\n\nJD INTELLIGENCE:`;
      if (mustHaveReqs.length > 0) jdContext += `\nMUST-HAVE REQUIREMENTS: ${mustHaveReqs.slice(0, 10).join('; ')}`;
      if (seniority) {
        jdContext += `\nSENIORITY: ${seniority.level} (${seniority.management_scope})`;
      }
    }

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt + jdContext },
        {
          role: 'user',
          content: `Target Job: ${jobTitle || 'Not specified'} at ${companyName || 'Not specified'}

JOB DESCRIPTION:
${jobDescription.slice(0, 8000)}

CANDIDATE'S CURRENT RESUME:
${resumeText.slice(0, 8000)}

Generate the Human-First optimized resume HTML now. Return ONLY the HTML content, no markdown fences or explanations.`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limited — try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errText = await response.text();
      throw new Error(`AI request failed (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    let resumeHtml = data.choices?.[0]?.message?.content || '';

    resumeHtml = resumeHtml.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

    if (!resumeHtml || resumeHtml.length < 100) {
      throw new Error('Generated resume was empty or too short');
    }

    return new Response(
      JSON.stringify({
        success: true,
        resume_html: resumeHtml,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Clarity resume generation error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
