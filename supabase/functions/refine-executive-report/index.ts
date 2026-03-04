import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { currentHtml, userMessage, jobDescription, companyName, jobTitle, branding, styleContext } = await req.json();
    if (!userMessage) {
      return new Response(JSON.stringify({ error: 'User message is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `You are an expert executive communication specialist. You are refining an existing Executive Status Report based on user feedback.
${styleContext || ''}

RULES:
- Output the COMPLETE modified HTML file, starting with <!DOCTYPE html> and ending with </html>
- Keep all existing content unless explicitly asked to change it
- Maintain the self-contained nature (all CSS embedded inline)
- Apply the requested changes precisely
- Do NOT add explanations — output ONLY the HTML

STYLE SIGNAL DETECTION:
If the user's feedback implies a general style preference (e.g. "make it shorter", "use more bullet points", "less formal"), after the HTML output, add a JSON block:
\`\`\`json
{"style_signals":[{"category":"tone|length|formatting|emphasis|vocabulary|structure","preference":"...","confidence":0.7,"source_quote":"user's words"}]}
\`\`\`
Only flag preferences that are GENERAL (apply across documents), not task-specific. If none detected, omit this block.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the current Executive Report HTML:\n\n${currentHtml}\n\n---\n\nPlease make this modification: ${userMessage}` },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-3-flash-preview', messages, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limited. Please try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI refinement failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
  } catch (e) {
    console.error('Refine executive report error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
