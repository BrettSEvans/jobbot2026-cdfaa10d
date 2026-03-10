import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function stripContent(html: string): string {
  // Remove text content, keep structural tags and CSS classes
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, (m) => m) // keep styles
    .replace(/>[^<]+</g, "><") // strip text between tags
    .replace(/\s{2,}/g, " ")
    .slice(0, 8000); // limit per asset
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { applicationId, assets, branding } = await req.json();

    if (!assets || assets.length < 2) {
      return new Response(JSON.stringify({ error: "At least 2 assets required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip content from HTML, keep structure
    const structuralAssets = assets.map((a: { assetName: string; html: string }) => ({
      assetName: a.assetName,
      structure: stripContent(a.html),
    }));

    const brandingContext = branding
      ? `Company branding: primary color ${branding.primaryColor || "unknown"}, font ${branding.fontFamily || "unknown"}, accent ${branding.accentColor || "unknown"}.`
      : "No company branding data available.";

    const systemPrompt = `You are a design analysis expert evaluating the structural and visual diversity of a portfolio of professional documents created for a job application.

Your task: Analyze the HTML structure of each document to determine how visually distinct they are from each other. The goal is that each document tells a different visual story appropriate to its purpose, while maintaining consistent company branding.

Evaluation criteria:
1. LAYOUT DIVERSITY: Do documents use different layout approaches? (e.g., one uses a timeline, another uses a data grid, another uses an infographic style). Identical header + bold paragraph + colored block patterns across all documents = LOW variability.
2. STRUCTURAL ELEMENTS: Variety in use of tables, charts, grids, cards, sidebars, timelines, progress bars, etc.
3. BRANDING CONSISTENCY: Do all documents reference the company's colors, fonts, and visual identity? Higher score = better brand alignment.
4. VISUAL STORYTELLING: Each document type should have a layout that matches its purpose (e.g., a roadmap should look like a timeline, a competitive analysis should use comparison tables).

${brandingContext}

Score calibration:
- 0-30: Nearly identical layouts across all documents (same header/body/block pattern repeated)
- 31-50: Minor structural variations but fundamentally similar templates
- 51-70: Moderate variety with some distinct layout approaches
- 71-85: Strong variety, each document has a noticeably different visual approach
- 86-100: Exceptional variety, each document is uniquely crafted for its purpose`;

    const userPrompt = `Analyze these ${structuralAssets.length} document structures for design variability:\n\n${structuralAssets.map((a: { assetName: string; structure: string }, i: number) => `--- Document ${i + 1}: ${a.assetName} ---\n${a.structure}`).join("\n\n")}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate all pairwise asset name combinations for the tool schema
    const assetNames = assets.map((a: { assetName: string }) => a.assetName);
    const pairDescriptions: string[] = [];
    for (let i = 0; i < assetNames.length; i++) {
      for (let j = i + 1; j < assetNames.length; j++) {
        pairDescriptions.push(`${assetNames[i]} vs ${assetNames[j]}`);
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "report_variability",
              description: "Report the design variability analysis results",
              parameters: {
                type: "object",
                properties: {
                  overallScore: {
                    type: "number",
                    description: "Overall design variability score 0-100",
                  },
                  brandingScore: {
                    type: "number",
                    description: "How well assets align with company branding 0-100",
                  },
                  pairwiseScores: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        asset1: { type: "string" },
                        asset2: { type: "string" },
                        similarity: {
                          type: "number",
                          description: "Similarity score 0-100 (higher = more similar, less variety)",
                        },
                      },
                      required: ["asset1", "asset2", "similarity"],
                      additionalProperties: false,
                    },
                  },
                  structuralPatterns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        assetName: { type: "string" },
                        dominantPattern: {
                          type: "string",
                          description: "Brief description of this asset's dominant layout pattern",
                        },
                      },
                      required: ["assetName", "dominantPattern"],
                      additionalProperties: false,
                    },
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Actionable suggestions to improve design variety",
                  },
                },
                required: [
                  "overallScore",
                  "brandingScore",
                  "pairwiseScores",
                  "structuralPatterns",
                  "recommendations",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_variability" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Clamp scores
    result.overallScore = Math.max(0, Math.min(100, Math.round(result.overallScore)));
    result.brandingScore = Math.max(0, Math.min(100, Math.round(result.brandingScore)));
    result.scoredAt = new Date().toISOString();

    // Persist to DB
    if (applicationId) {
      await supabase
        .from("job_applications")
        .update({ design_variability: result })
        .eq("id", applicationId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-design-variability error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
