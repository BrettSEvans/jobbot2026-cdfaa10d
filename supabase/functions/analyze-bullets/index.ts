const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode } = body;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODE: rewrite a single bullet with user context
    if (mode === 'rewrite') {
      const { original, userAnswer, jobDescription } = body;
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: `You are a resume bullet point optimizer. Rewrite the bullet point using the XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]". Incorporate the user's answer to add specific metrics. Keep it concise (1-2 lines). Mirror keywords from the job description where truthful.`
            },
            {
              role: 'user',
              content: `Original bullet: "${original}"\nUser's additional context: "${userAnswer}"\nJob description excerpt: "${(jobDescription || '').slice(0, 2000)}"\n\nRewrite this bullet with specific metrics.`
            }
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: 'Rate limited.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        throw new Error('Rewrite failed');
      }

      const data = await response.json();
      const rewrite = data.choices?.[0]?.message?.content?.trim() || '';
      return new Response(
        JSON.stringify({ success: true, rewrite }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODE: analyze all bullets
    const { resumeHtml, jobDescription } = body;
    if (!resumeHtml) {
      return new Response(
        JSON.stringify({ success: false, error: 'No resume HTML provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a resume coach specializing in quantification and impact metrics.

Analyze each bullet point from the resume and rate its strength:
- "strong": Has specific metrics, numbers, or measurable outcomes (e.g., "Increased revenue by 30%")
- "needs_work": Has some specificity but could be stronger with numbers (e.g., "Led team to improve performance")
- "weak": Vague, uses passive language, no metrics (e.g., "Responsible for managing projects")

For non-strong bullets, provide:
1. The specific issue (what's missing)
2. A coaching question to elicit the missing metric from the user
3. A suggested rewrite using the XYZ formula

Focus on the 8-12 most impactful bullets. Skip contact info, education details, and section headers.`
          },
          {
            role: 'user',
            content: `Resume HTML:\n${resumeHtml.slice(0, 12000)}\n\nJob Description:\n${(jobDescription || '').slice(0, 4000)}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_bullets",
            description: "Return bullet point analysis with strength ratings",
            parameters: {
              type: "object",
              properties: {
                bullets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      original: { type: "string", description: "The original bullet text" },
                      strength: { type: "string", enum: ["strong", "needs_work", "weak"] },
                      issue: { type: "string", description: "What's missing (for non-strong)" },
                      question: { type: "string", description: "Coaching question to ask the user" },
                      suggestion: { type: "string", description: "XYZ formula rewrite suggestion" }
                    },
                    required: ["original", "strength"],
                    additionalProperties: false
                  }
                }
              },
              required: ["bullets"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "analyze_bullets" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limited.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (status === 402) return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error('Analysis failed');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || '{"bullets":[]}';
      result = JSON.parse(content);
    }

    return new Response(
      JSON.stringify({ success: true, bullets: result.bullets }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Bullet analysis error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
