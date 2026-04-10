import { errorResponse } from "../_shared/errorResponse.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { currentContent, contentType, assetName, userMessage, chatHistory } = await req.json();

    if (!userMessage || !currentContent) {
      return new Response(
        JSON.stringify({ error: 'userMessage and currentContent are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isHtml = contentType === 'html';

     const systemPrompt = isHtml
      ? `You are a Principal Business Architect and Lead Technical Editor refining a professional "${assetName || 'document'}" HTML document. Your style is modeled after top-tier management consulting firms (e.g., McKinsey, BCG). You prioritize the "Data-to-Ink Ratio."

RULES:
- Output the COMPLETE modified HTML file, starting with <!DOCTYPE html> (or the opening tag) and ending with </html>
- Keep all existing content and styling unless explicitly asked to change it
- Maintain the self-contained nature (all CSS embedded)
- Apply the requested changes precisely
- Do NOT add explanations or markdown fences — output ONLY the HTML
- The document MUST fit on exactly one printed US Letter page (8.5x11in). Do NOT add content that would cause overflow.
- NEVER use overflow: hidden, overflow: auto, or overflow: scroll on ANY text container (divs, sections, cards, frames). Only the outermost page wrapper may clip.
- ALL text containers MUST use height: auto and overflow: visible. NEVER use fixed height or max-height on text elements.
- NEVER use position: absolute or position: fixed on any element.
- NEVER use font sizes smaller than 9pt.
- Maximum 3 body sections. If adding content, condense or merge existing sections to maintain the one-page constraint.
- Paragraphs: max 2 sentences, 50 words. Bullets: max 3-4 per section, 12 words each. Tables: max 3-4 rows.
- Do NOT use framed/boxed section containers — use simple headers with underlines.
- Aim for 80-85% page fill — complete but not cramped.`
      : `You are an expert career writer refining a professional ${assetName || 'cover letter'}.

RULES:
- Output the COMPLETE modified text
- Keep the professional tone and formatting unless asked to change it
- Apply the requested changes precisely
- Do NOT add explanations, markdown fences, or labels — output ONLY the refined text
- Preserve paragraph structure and line breaks`;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Include recent chat history for context
    if (chatHistory?.length) {
      for (const msg of chatHistory.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({
      role: 'user',
      content: `Here is the current ${isHtml ? 'HTML' : 'text'}:\n\n${currentContent}\n\n---\n\nPlease make this modification: ${userMessage}`,
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
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
    console.error('Refine material error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'An internal error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
