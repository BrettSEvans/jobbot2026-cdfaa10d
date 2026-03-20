const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription, companyName, jobTitle, competitors, products, customers } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `You are a strategic planning consultant. Generate a professional 90-Day Roadmap for someone starting the described role.

OUTPUT: Return a single self-contained HTML document with embedded CSS. The roadmap should:
- Title: "${companyName || 'Company'} — ${jobTitle || 'Role'}: 90-Day Strategic Roadmap"
- Three phases: Days 1-30 (Learn & Assess), Days 31-60 (Build & Execute), Days 61-90 (Scale & Deliver)
- Each phase with 5-8 specific, actionable initiatives tied to the JD requirements
- A visual timeline/Gantt-style representation using CSS (no external libraries)
- Success metrics and KPIs for each phase
- Key stakeholder engagement plan
- Quick wins identified for each phase
- Dependencies and prerequisites between initiatives
- Professional design suitable for executive presentation
- Summary of expected outcomes at 90 days

Competitors: ${(competitors || []).join(', ') || 'N/A'}
Products: ${(products || []).join(', ') || 'N/A'}
Customers: ${(customers || []).join(', ') || 'N/A'}

Make the roadmap specific to the role responsibilities and company context described.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Company: ${companyName || 'Unknown'}\nJob Title: ${jobTitle || 'Unknown'}\n\nJob Description:\n${(jobDescription || '').slice(0, 6000)}\n\nGenerate the 90-Day Roadmap HTML now.` },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
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
    console.error('Roadmap generation error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
