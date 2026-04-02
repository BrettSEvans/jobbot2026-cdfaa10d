import { errorResponse } from "../_shared/errorResponse.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentDashboardData, currentHtml, userMessage, chatHistory } = await req.json();

    if (!userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: 'User message is required' }),
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

    // Use JSON-based refinement if we have structured data, otherwise fall back to HTML
    const useJsonMode = !!currentDashboardData;

    const systemPrompt = useJsonMode
      ? `You are an expert business intelligence data architect. You are refining a dashboard's structured JSON data based on user feedback.

OUTPUT: ONLY valid JSON. No markdown fences, no explanation. Start with { and end with }.

The JSON follows this schema:
{
  "meta": { "companyName", "jobTitle", "department", "logoUrl?" },
  "branding": { "primary", "onPrimary", "primaryContainer", "onPrimaryContainer", "secondary", "onSecondary", "surface", "onSurface", "surfaceVariant", "outline", "error", "fontHeading", "fontBody", "background" },
  "navigation": [{ "id", "label", "icon" }],
  "sections": [{ "id", "title", "description", "metrics": [{ "label", "value", "change", "trend" }], "charts": [{ "id", "title", "type", "data": { "labels", "datasets" } }], "tables": [{ "id", "title", "columns", "generateRows" }] }],
  "agenticWorkforce": [{ "name", "coreFunctionality", "interfacingTeams" }],
  "cfoScenarios": [{ "id", "title", "description", "type", "sliders", "baseline", "quarters", "chartType" }]
}

RULES:
- Return the COMPLETE modified JSON object with the user's requested changes applied
- Keep all existing data unless explicitly asked to change it
- Maintain valid JSON structure at all times
- Apply changes precisely as requested
- Chart types: bar|line|doughnut|pie|radar|scatter|horizontalBar|area
- Table generateRows fields: personName|company|date|futureDate|currency|status|region|product|percent|integer|email|pick
- Ensure navigation includes "agentic-workforce" and "cfo-view" entries`
      : `You are an expert front-end developer helping refine a standalone HTML Business Intelligence Dashboard.

RULES:
- Output the COMPLETE modified HTML file, starting with <!DOCTYPE html> and ending with </html>
- Keep all existing functionality unless explicitly asked to change it
- Maintain the self-contained nature (all CSS/JS embedded)
- Preserve Chart.js charts and interactive elements
- Apply the requested changes precisely
- Do NOT add explanations — output ONLY the HTML`;

    const messages: Array<{role: string; content: string}> = [
      { role: 'system', content: systemPrompt },
    ];

    if (chatHistory?.length) {
      for (const msg of chatHistory.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const currentContent = useJsonMode
      ? JSON.stringify(currentDashboardData, null, 2)
      : currentHtml;

    messages.push({
      role: 'user',
      content: `Here is the current dashboard ${useJsonMode ? 'JSON data' : 'HTML'}:\n\n${currentContent}\n\n---\n\nPlease make this modification: ${userMessage}`
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI refinement failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('Refine error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'An internal error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
