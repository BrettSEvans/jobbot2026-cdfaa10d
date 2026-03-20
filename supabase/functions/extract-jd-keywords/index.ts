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
    const { jobDescription } = await req.json();

    if (!jobDescription || jobDescription.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job description is too short (min 50 chars)' }),
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

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Role: You are an expert ATS keyword analyst and technical recruiter with 15 years of experience parsing job descriptions for applicant tracking system optimization.

Task: Extract the top 15-20 most ATS-critical keywords from the provided job description.

Rules:
1. Prefer EXACT PHRASING from the JD — do NOT paraphrase or synonym-swap (e.g., "cross-functional collaboration" not "working across teams")
2. Include specific tools/technologies by name (e.g., "Kubernetes" not "container orchestration")
3. Weight required qualifications 2x over preferred/nice-to-have
4. Include industry-specific jargon that ATS systems match on
5. Exclude generic filler phrases (e.g., "team player", "fast-paced environment", "detail-oriented")
6. Prioritize multi-word technical terms ("machine learning") over single generic words ("communication")
7. Include tool names exactly as written in the JD
8. Rank by ATS importance:
   - TIER 1 (critical): In job title or first paragraph, or in Requirements/Must-have sections
   - TIER 2 (preferred): In Preferred/Nice-to-have sections or mentioned once in body
   - TIER 3 (bonus): In general description or company overview
9. Count frequency — keywords mentioned multiple times rank higher
10. Cap at 20 keywords — quality over quantity`
        },
        {
          role: 'user',
          content: `Extract ATS keywords from this job description:\n\n${jobDescription.slice(0, 10000)}`
        }
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_keywords",
          description: "Return structured keyword analysis from a job description",
          parameters: {
            type: "object",
            properties: {
              keywords: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    keyword: { type: "string", description: "Exact phrase from the JD" },
                    category: { type: "string", enum: ["hard_skill", "tool", "certification", "methodology", "domain", "soft_skill"] },
                    frequency: { type: "number", description: "Times mentioned or strongly implied" },
                    importance: { type: "string", enum: ["critical", "preferred", "nice_to_have"] },
                    context: { type: "string", description: "Brief quote showing where this keyword appeared" }
                  },
                  required: ["keyword", "category", "frequency", "importance", "context"],
                  additionalProperties: false
                }
              },
              job_function: {
                type: "string",
                enum: ["engineering", "sales", "marketing", "operations", "design", "data", "finance", "hr", "product", "other"]
              }
            },
            required: ["keywords", "job_function"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "extract_keywords" } }
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limited. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI error:', response.status, t);
      return new Response(JSON.stringify({ success: false, error: 'Keyword extraction failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || '{}';
      result = JSON.parse(content);
    }

    const importanceOrder: Record<string, number> = { critical: 0, preferred: 1, nice_to_have: 2 };
    result.keywords.sort((a: any, b: any) => {
      const impDiff = (importanceOrder[a.importance] ?? 2) - (importanceOrder[b.importance] ?? 2);
      if (impDiff !== 0) return impDiff;
      return (b.frequency ?? 0) - (a.frequency ?? 0);
    });

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Keyword extraction error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
