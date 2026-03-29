import { errorResponse } from "../_shared/errorResponse.ts";
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
    const { jobDescription, resumeText, companyName, jobTitle } = await req.json();

    if (!jobDescription || jobDescription.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job description too short' }),
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
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        {
          role: 'system',
          content: `You are a professional resume summary writer. Generate a compelling 3-line professional summary following this structure:

Line 1: "[Years] years of experience in [domain directly from JD] with proven expertise in [top 2 JD requirements]."
Line 2: "Track record of [specific achievement pattern from resume matching JD needs], driving [measurable outcome type from JD]."
Line 3: "Skilled in [3-4 exact tool/skill keywords from JD that match resume], seeking to [value proposition aligned with JD's team/company goals]."

RULES:
1. Mirror the EXACT job title from the JD
2. Years must match the candidate's actual resume — NEVER round up or fabricate
3. Every claim must be traceable to the candidate's actual resume content
4. Use the JD's own language for skills and requirements
5. NEVER use: "results-driven", "passionate about", "team player", "fast-paced environment", "go-getter", "detail-oriented" (unless the JD specifically uses them)
6. If the candidate's experience doesn't match well, be honest about adjacent skills
7. Keep it 200-350 characters total
8. If no resume text provided, generate based on JD requirements alone with placeholder brackets for personalization`
        },
        {
          role: 'user',
          content: `Job Title: ${jobTitle || 'Not specified'}\nCompany: ${companyName || 'Not specified'}\n\nJob Description:\n${jobDescription.slice(0, 6000)}\n\nCandidate Resume:\n${(resumeText || 'No resume text provided — use JD requirements with [placeholder] brackets').slice(0, 6000)}`
        }
      ],
      tools: [{
        type: "function",
        function: {
          name: "generate_summary",
          description: "Generate a professional summary for a resume",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "The 3-line professional summary" },
              keywords_used: {
                type: "array",
                items: { type: "string" },
                description: "JD keywords incorporated into the summary"
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "How well the summary matches both JD and resume"
              }
            },
            required: ["summary", "keywords_used", "confidence"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "generate_summary" } }
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limited.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error('Summary generation failed');
    }

    const rawText = await response.text();
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('AI returned an empty response — please retry');
    }
    let data;
    try { data = JSON.parse(rawText); } catch { throw new Error('AI returned invalid JSON — please retry'); }
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall) {
      try { result = JSON.parse(toolCall.function.arguments); } catch { result = { summary: toolCall.function.arguments || '', keywords_used: [], confidence: 'low' }; }
    } else {
      const content = data.choices?.[0]?.message?.content || '';
      result = { summary: content, keywords_used: [], confidence: 'low' };
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Summary generation error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'An internal error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
