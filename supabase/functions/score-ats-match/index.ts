import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
      console.error("AI gateway error:", aiResp.status, errText);

      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
