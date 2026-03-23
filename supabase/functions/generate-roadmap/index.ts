import { aiFetchWithRetry } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription, companyName, jobTitle, competitors, products, customers, candidateName } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ONE_PAGE_RULES = `
MANDATORY LAYOUT RULES — strictly follow every rule:
1. The entire document MUST fit on a single US Letter page (8.5 × 11 in / 215.9 × 279.4 mm).
2. Use this exact wrapper structure:
   <div class="page-shell" style="width:8.5in; min-height:11in; max-height:11in; margin:0 auto; padding:0.4in; display:flex; flex-direction:column; overflow:hidden; box-sizing:border-box;">
     <div class="page-content" style="flex:1; overflow:visible;">
       <!-- ALL content here -->
     </div>
   </div>
3. Add @page { size: letter portrait; margin: 0; } and @media print { body { -webkit-print-color-adjust: exact; } }
4. NEVER use overflow:hidden on ANY text container or content div — only on page-shell.
5. NEVER use position:absolute or position:fixed on content elements.
6. NEVER set fixed height on content divs (no height:Npx on cards, sections, tables).
7. Body must have margin:0; padding:0.`;

    const systemPrompt = `You are a strategic planning consultant. Generate a professional 90-Day Roadmap for someone starting the described role.

${ONE_PAGE_RULES}

CONTENT DENSITY RULES — critical for one-page fit:
- Maximum 3-4 specific initiatives per phase (NOT 5-8).
- Each initiative: one line, max 12 words.
- Success metrics: max 2-3 bullet points per phase, one line each.
- No stakeholder engagement plan section (save space).
- Quick wins: max 1-2 per phase, inline with initiatives.
- Paragraphs: max 50 words each.

OUTPUT: Return a single self-contained HTML document with embedded CSS. The roadmap should:
- Title: "${companyName || 'Company'} — ${jobTitle || 'Role'}: 90-Day Strategic Roadmap"
- Three phases: Days 1-30 (Learn & Assess), Days 31-60 (Build & Execute), Days 61-90 (Scale & Deliver)
- Each phase with 3-4 specific, actionable initiatives tied to the JD requirements
- A visual timeline/Gantt-style representation using CSS (no external libraries)
- Success metrics (2-3 per phase)
- Dependencies shown as brief inline notes
- Professional design suitable for executive presentation — fits ONE page
- Summary of expected outcomes at 90 days (2-3 sentences max)
- No interactive elements, no scrolling, no multi-page content

Competitors: ${(competitors || []).join(', ') || 'N/A'}
Products: ${(products || []).join(', ') || 'N/A'}
Customers: ${(customers || []).join(', ') || 'N/A'}

Make the roadmap specific to the role responsibilities and company context described.`;

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Company: ${companyName || 'Unknown'}\nJob Title: ${jobTitle || 'Unknown'}\n\nJob Description:\n${(jobDescription || '').slice(0, 6000)}\n\nGenerate the 90-Day Roadmap HTML now.` },
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
    console.error('Roadmap generation error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
