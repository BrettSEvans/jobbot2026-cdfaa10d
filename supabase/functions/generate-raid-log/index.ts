import { errorResponse } from "../_shared/errorResponse.ts";
import { aiFetchWithRetry, getModel } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription, companyName, jobTitle, competitors, products, candidateName } = await req.json();

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

    const systemPrompt = `You are a strategic program management consultant. Generate a comprehensive RAID Log (Risks, Assumptions, Issues, Dependencies) for someone starting the described role.

${ONE_PAGE_RULES}

CONTENT DENSITY RULES — critical for one-page fit:
- Each section (R, A, I, D): exactly 3-4 entries (NOT 5-8). Total 12-16 rows across all four sections.
- Table columns: ID, Description, Impact (H/M/L), Mitigation, Status. Drop "Category" and "Owner" columns to save width.
- Description cell: max 15 words.
- Mitigation cell: max 10 words.
- Use compact font size (9-10pt for table body).

STYLING:
- Use alternating row shading (light gray / white) for readability.
- Section headers should be bold with a subtle colored left border.
- Executive overview: 2-3 sentences max.

OUTPUT: Return a single self-contained HTML document with embedded CSS. The RAID log should be professional, printable, and include:
- A header with the company name, job title, and "RAID Log — First 90 Days"
- Four sections: Risks, Assumptions, Issues, Dependencies
- Each section as a styled table with columns: ID, Description, Impact (High/Medium/Low), Mitigation, Status
- Populate with 3-4 realistic entries per section based on the job description and company context
- Use alternating row shading for readability
- Include a brief executive overview at the top (2-3 sentences)
- Make it specific to the role, not generic
- No interactive elements, no scrolling, no multi-page content

Competitors context: ${(competitors || []).join(', ') || 'N/A'}
Products context: ${(products || []).join(', ') || 'N/A'}`;

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: getModel('standard'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Company: ${companyName || 'Unknown'}\nJob Title: ${jobTitle || 'Unknown'}\nCandidate: ${candidateName || 'Prepared by [Candidate]'}\n\nJob Description:\n${(jobDescription || '').slice(0, 6000)}\n\nGenerate the RAID Log HTML now. Include the candidate's name in the header or footer.` },
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
    console.error('RAID log generation error:', e);
    return new Response(JSON.stringify({ success: false, error: 'An internal error occurred' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
