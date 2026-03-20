import { aiFetchWithRetry } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription, companyName, jobTitle, products, competitors } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `You are a solutions architect. Generate a professional architecture diagram as a self-contained HTML document for someone starting the described role.

OUTPUT: Return a single self-contained HTML document with embedded CSS and SVG. The architecture diagram should:
- Show the organizational/technical architecture relevant to the role
- Include system components, data flows, integrations, and stakeholder relationships
- Use SVG-based boxes, arrows, and labels (no external images)
- Have a clean, professional layout suitable for executive presentations
- Include a legend explaining the visual elements
- Title: "${companyName || 'Company'} — ${jobTitle || 'Role'} Architecture Overview"
- Show the candidate's position within the org/system context
- Include relevant technology stack, tools, and platforms mentioned in the JD
- Use a modern color scheme with clear hierarchy

Products: ${(products || []).join(', ') || 'N/A'}
Competitors: ${(competitors || []).join(', ') || 'N/A'}

Make the diagram specific to the role responsibilities and technical environment described.`;

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Company: ${companyName || 'Unknown'}\nJob Title: ${jobTitle || 'Unknown'}\n\nJob Description:\n${(jobDescription || '').slice(0, 6000)}\n\nGenerate the architecture diagram HTML now.` },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errText = await response.text();
      throw new Error(`AI request failed (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    content = content.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
    const htmlStart = content.indexOf('<!');
    if (htmlStart > 0) content = content.slice(htmlStart);
    const htmlEnd = content.lastIndexOf('</html>');
    if (htmlEnd !== -1) content = content.slice(0, htmlEnd + 7);

    return new Response(JSON.stringify({ success: true, html: content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Architecture diagram generation error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
