import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetchWithRetry } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyMarkdown, jobDescription, companyName } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `You are a business analyst. Analyze the company website content and job description to identify:
1. The company's main products/services
2. Key competitors in their space
3. Target customer segments
4. The department this role belongs to (Sales, Marketing, GTM, Operations, etc.)
5. The company name if not provided

Return ONLY valid JSON with this structure:
{
  "companyName": "string",
  "department": "string",
  "products": ["string"],
  "competitors": ["string"],
  "customers": ["string"],
  "jobTitle": "string"
}`
        },
        {
          role: 'user',
          content: `Company: ${companyName || 'Unknown'}\n\nCompany Website Content:\n${companyMarkdown?.slice(0, 8000) || 'N/A'}\n\nJob Description:\n${jobDescription?.slice(0, 6000) || 'N/A'}`
        }
      ],
      tools: [{
        type: "function",
        function: {
          name: "analyze_company",
          description: "Return structured company analysis",
          parameters: {
            type: "object",
            properties: {
              companyName: { type: "string" },
              department: { type: "string" },
              products: { type: "array", items: { type: "string" } },
              competitors: { type: "array", items: { type: "string" } },
              customers: { type: "array", items: { type: "string" } },
              jobTitle: { type: "string" }
            },
            required: ["companyName", "department", "products", "competitors", "customers", "jobTitle"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "analyze_company" } }
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI error:', response.status, t);
      return new Response(JSON.stringify({ error: 'Analysis failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;
    if (toolCall) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || '{}';
      analysis = JSON.parse(content);
    }

    return new Response(
      JSON.stringify({ success: true, ...analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Analysis error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
