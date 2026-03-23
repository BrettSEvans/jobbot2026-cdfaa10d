import { aiFetchWithRetry } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription, companyName, jobTitle, products, competitors, candidateName } = await req.json();

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
7. NEVER use large decorative background shapes (triangles, circles, overlays) that cover content.
8. Body must have margin:0; padding:0.`;

    const systemPrompt = `You are a solutions architect. Generate a professional architecture diagram as a self-contained HTML document for someone starting the described role.

${ONE_PAGE_RULES}

SVG ARROW/CONNECTOR RULES — critical:
- Every arrow MUST connect to a card's EDGE (right-side for outgoing, left/top/bottom for incoming — whichever edge is geometrically closest).
- Arrows MUST route AROUND cards. An arrow may NEVER pass through or overlap a card.
- Use SVG <line>, <polyline>, or <path> elements with arrowhead markers. Calculate coordinates so lines touch card borders, not card centers.
- If two cards are not adjacent, use an L-shaped or Z-shaped polyline that stays in the gutters between cards.

LEGEND RULES:
- Legend must be compact, inline (e.g., a small horizontal bar at the bottom), never floating or overlapping content.

OUTPUT: Return a single self-contained HTML document with embedded CSS and SVG. The architecture diagram should:
- Show the organizational/technical architecture relevant to the role
- Include system components, data flows, integrations, and stakeholder relationships
- Use SVG-based boxes with arrows following the connector rules above
- Have a clean, professional layout suitable for executive presentations — fits ONE page
- Include a compact inline legend explaining the visual elements
- Title: "${companyName || 'Company'} — ${jobTitle || 'Role'} Architecture Overview"
- Show the candidate's position within the org/system context
- Include relevant technology stack, tools, and platforms mentioned in the JD
- Use a modern color scheme with clear hierarchy
- Maximum 6-8 component boxes to ensure readability on one page
- No interactive elements, no scrolling, no multi-page content

Products: ${(products || []).join(', ') || 'N/A'}
Competitors: ${(competitors || []).join(', ') || 'N/A'}

Make the diagram specific to the role responsibilities and technical environment described.`;

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Company: ${companyName || 'Unknown'}\nJob Title: ${jobTitle || 'Unknown'}\nCandidate: ${candidateName || 'Prepared by [Candidate]'}\n\nJob Description:\n${(jobDescription || '').slice(0, 6000)}\n\nGenerate the architecture diagram HTML now. Include the candidate's name in the header or footer.` },
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
