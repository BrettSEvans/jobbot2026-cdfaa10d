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
      ? `You are an expert consultant refining a professional "${assetName || 'document'}" HTML document.

RULES:
- Output the COMPLETE modified HTML file, starting with <!DOCTYPE html> and ending with </html>
- Keep all existing content and styling unless explicitly asked to change it
- Maintain the self-contained nature (all CSS embedded)
- Apply the requested changes precisely
- Do NOT add explanations or markdown fences — output ONLY the HTML
- The document MUST fit on exactly one printed US Letter page (8.5x11in). Do NOT add content that would cause overflow.
- RADICAL SIMPLICITY: MAX 3 body sections. Single-column or two-column 60/40 only. No framed cards or bordered boxes.
- CONTENT BREVITY: MAX 50 words per paragraph, MAX 3-4 bullets per section (10 words each), MAX 4 table rows.
- NEVER use overflow: hidden, overflow: auto, or overflow: scroll on ANY text container.
- ALL text containers MUST use height: auto and overflow: visible.
- NEVER use position: absolute or position: fixed on any element.
- NEVER use font sizes smaller than 9pt.
- If adding content, remove or merge existing sections to maintain the one-page constraint and 200-300 word target.`
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
        model: 'google/gemini-2.5-flash',
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
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
