import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_LIMITS: Record<string, { perHour: number; perDay: number }> = {
  free: { perHour: 5, perDay: 15 },
  pro: { perHour: -1, perDay: 100 },
  premium: { perHour: -1, perDay: 250 },
};

async function checkRateLimit(req: Request, assetType: string, edgeFunction: string): Promise<Response | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = data?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: override } = await svc.from('rate_limit_overrides').select('is_unlimited, per_hour, per_day').eq('user_id', userId).maybeSingle();
    if (override?.is_unlimited) {
      await svc.from('generation_usage').insert({ user_id: userId, asset_type: assetType, edge_function: edgeFunction });
      return null;
    }
    const { data: sub } = await svc.from('user_subscriptions').select('tier').eq('user_id', userId).maybeSingle();
    const tier = (sub?.tier as string) || 'free';
    const tierDefaults = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const limits = { perHour: override?.per_hour ?? tierDefaults.perHour, perDay: override?.per_day ?? tierDefaults.perDay };
    const now = Date.now();
    const { count: hourCount } = await svc.from('generation_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 3600_000).toISOString());
    const { count: dayCount } = await svc.from('generation_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 86400_000).toISOString());
    if ((limits.perHour !== -1 && (hourCount ?? 0) >= limits.perHour) || (limits.perDay !== -1 && (dayCount ?? 0) >= limits.perDay)) {
      const upgradeHint = tier !== 'premium' ? ` Upgrade to ${tier === 'free' ? 'Pro' : 'Premium'} for higher limits.` : '';
      return new Response(JSON.stringify({ error: `Rate limit exceeded.${upgradeHint}`, retry_after_seconds: 60, tier }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await svc.from('generation_usage').insert({ user_id: userId, asset_type: assetType, edge_function: edgeFunction });
  } catch (e) { console.warn('Rate limit check failed, allowing request:', e); }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rateLimitResponse = await checkRateLimit(req, 'ats-score', 'score-ats-match');
    if (rateLimitResponse) return rateLimitResponse;

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

    const resumeText = resumeHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) scoring and resume analysis engine. Analyze a resume against a job description and produce a comprehensive health report.

SCORING RUBRIC (be strict and consistent):
- 0-30: Poor match — few relevant keywords, wrong domain/skills
- 31-60: Partial match — some relevant keywords but significant gaps
- 61-80: Strong match — most required skills present, minor gaps
- 81-100: Near-perfect match — comprehensive keyword coverage, strong alignment

You MUST analyze ALL of the following dimensions:

1. ATS KEYWORD MATCH: Extract required skills/technologies from the JD, group synonyms, check coverage.
2. PARSE RATE: Check for standard resume sections (Contact, Summary, Experience, Education, Skills, Certifications). Score 0-100 based on how many are present and well-structured.
3. IMPACT ANALYSIS: Scan bullet points for quantifiable achievements (numbers, %, $, metrics). Classify bullets as "strong" (result-oriented with metrics) or "weak" (task-oriented without metrics). For up to 3 weak bullets, suggest a rewrite.
4. REPETITION AUDIT: Find overused action verbs (used 3+ times). For each, provide 3-5 high-impact synonyms.
5. PROFESSIONALISM: Flag issues like unprofessional email, missing LinkedIn URL, summary over 100 words, etc.`;

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
        max_tokens: 4000,
        tools: [
          {
            type: "function",
            function: {
              name: "resume_health_report",
              description: "Return a comprehensive resume health analysis report.",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Overall ATS match score 0-100" },
                  parseRate: { type: "number", description: "Section parse success rate 0-100" },
                  parsedSections: { type: "array", items: { type: "string" }, description: "Successfully parsed section names" },
                  missingSections: { type: "array", items: { type: "string" }, description: "Missing or poorly structured sections" },
                  matchedKeywords: { type: "array", items: { type: "string" }, description: "Keywords from JD found in resume" },
                  missingKeywords: { type: "array", items: { type: "string" }, description: "Keywords from JD missing in resume" },
                  suggestions: { type: "array", items: { type: "string" }, description: "Actionable improvement suggestions" },
                  keywordGroups: {
                    type: "object",
                    additionalProperties: { type: "array", items: { type: "string" } },
                    description: "Keyword synonym groups",
                  },
                  impactAnalysis: {
                    type: "object",
                    properties: {
                      strongBullets: { type: "number", description: "Count of result-oriented bullets with metrics" },
                      weakBullets: { type: "number", description: "Count of task-oriented bullets without metrics" },
                      weakExamples: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            text: { type: "string", description: "The weak bullet text" },
                            suggestion: { type: "string", description: "Suggested rewrite with metrics" },
                          },
                          required: ["text", "suggestion"],
                        },
                        description: "Up to 3 weak bullets with rewrites",
                      },
                    },
                    required: ["strongBullets", "weakBullets", "weakExamples"],
                  },
                  repetitionAudit: {
                    type: "object",
                    properties: {
                      overusedWords: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            word: { type: "string" },
                            count: { type: "number" },
                            synonyms: { type: "array", items: { type: "string" } },
                          },
                          required: ["word", "count", "synonyms"],
                        },
                      },
                    },
                    required: ["overusedWords"],
                  },
                  professionalismFlags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Professional formatting issues found",
                  },
                },
                required: [
                  "score", "parseRate", "parsedSections", "missingSections",
                  "matchedKeywords", "missingKeywords", "suggestions", "keywordGroups",
                  "impactAnalysis", "repetitionAudit", "professionalismFlags",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "resume_health_report" } },
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

    // Extract from tool call response
    let result: Record<string, unknown>;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch {
        console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
        return new Response(
          JSON.stringify({ error: "Failed to parse scoring result", code: "PARSE_ERROR" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Fallback: try to parse from content
      const rawContent = aiData.choices?.[0]?.message?.content || "";
      let jsonStr = rawContent;
      const fenceMatch = rawContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (fenceMatch) jsonStr = fenceMatch[1];
      try {
        result = JSON.parse(jsonStr.trim());
      } catch {
        console.error("Failed to parse ATS score JSON:", rawContent);
        return new Response(
          JSON.stringify({ error: "Failed to parse scoring result", code: "PARSE_ERROR" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate and clamp scores
    result.score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));
    result.parseRate = Math.max(0, Math.min(100, Math.round(Number(result.parseRate) || 0)));
    result.matchedKeywords = result.matchedKeywords || [];
    result.missingKeywords = result.missingKeywords || [];
    result.suggestions = result.suggestions || [];
    result.keywordGroups = result.keywordGroups || {};
    result.parsedSections = result.parsedSections || [];
    result.missingSections = result.missingSections || [];
    result.impactAnalysis = result.impactAnalysis || { strongBullets: 0, weakBullets: 0, weakExamples: [] };
    result.repetitionAudit = result.repetitionAudit || { overusedWords: [] };
    result.professionalismFlags = result.professionalismFlags || [];

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
