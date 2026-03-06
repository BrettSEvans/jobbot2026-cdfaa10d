import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, resumeHtml } = await req.json();

    if (!jobDescription || !resumeHtml) {
      return new Response(
        JSON.stringify({ error: "jobDescription and resumeHtml are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strip HTML tags for cleaner analysis
    const resumeText = resumeHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const systemPrompt = `You are an ATS (Applicant Tracking System) scoring expert. Analyze a resume against a job description and produce a compatibility score.

SCORING RUBRIC (be strict and consistent):
- 0-30: Poor match — few relevant keywords, wrong domain/skills
- 31-60: Partial match — some relevant keywords but significant gaps
- 61-80: Strong match — most required skills present, minor gaps
- 81-100: Near-perfect match — comprehensive keyword coverage, strong alignment

INSTRUCTIONS:
1. Extract ALL required skills, technologies, qualifications from the job description
2. Group synonyms together (e.g., "React", "React.js", "ReactJS" are ONE group)
3. Check which keyword groups appear in the resume
4. Calculate score based on coverage percentage, weighted by keyword importance
5. Provide actionable suggestions for improvement

Return ONLY valid JSON with this exact schema:
{
  "score": <number 0-100>,
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword3", "keyword4"],
  "suggestions": ["Add X experience", "Mention Y skill"],
  "keywordGroups": {
    "Primary Keyword": ["synonym1", "synonym2"]
  }
}`;

    const userPrompt = `JOB DESCRIPTION:\n${jobDescription.slice(0, 8000)}\n\nRESUME:\n${resumeText.slice(0, 8000)}`;

    const gatewayUrl = Deno.env.get("AI_GATEWAY_URL");
    if (!gatewayUrl) {
      return new Response(
        JSON.stringify({ error: "AI gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResp = await fetch(gatewayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", errText);
      return new Response(
        JSON.stringify({ error: "AI scoring failed", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code fences)
    let jsonStr = rawContent;
    const fenceMatch = rawContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1];

    let result;
    try {
      result = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Failed to parse ATS score JSON:", rawContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse scoring result", code: "PARSE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and clamp score
    result.score = Math.max(0, Math.min(100, Math.round(result.score || 0)));
    result.matchedKeywords = result.matchedKeywords || [];
    result.missingKeywords = result.missingKeywords || [];
    result.suggestions = result.suggestions || [];
    result.keywordGroups = result.keywordGroups || {};

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("score-ats-match error:", err);
    return new Response(
      JSON.stringify({ error: err.message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
