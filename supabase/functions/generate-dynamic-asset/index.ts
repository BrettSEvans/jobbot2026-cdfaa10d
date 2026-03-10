import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function logUsage(req: Request, assetType: string, edgeFunction: string): Promise<Response | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = data?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await svc.from('generation_usage').insert({ user_id: userId, asset_type: assetType, edge_function: edgeFunction });
  } catch (e) { console.warn('Usage logging failed, allowing request:', e); }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assetName, briefDescription, jobDescription, resumeText, companyName, jobTitle, branding, styleContext, layoutStyle, siblingStructures } = await req.json();

    await logUsage(req, `dynamic-asset:${assetName}`, 'generate-dynamic-asset');

    if (!assetName || !jobDescription) {
      return new Response(
        JSON.stringify({ error: 'assetName and jobDescription are required' }),
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

    const brandColors = branding?.colors || {};
    const brandFonts = branding?.fonts || branding?.typography?.fontFamilies || {};
    const primaryColor = brandColors.primary || brandColors['dominant-1'] || '#1a365d';
    const secondaryColor = brandColors.secondary || brandColors['dominant-2'] || '#2563eb';
    const accentColor = brandColors.accent || brandColors['dominant-3'] || secondaryColor;
    const primaryFont = brandFonts.primary || brandFonts.heading || (branding?.fonts?.[0]?.family) || '';
    const bodyFont = brandFonts.body || brandFonts.primary || (branding?.fonts?.[1]?.family || branding?.fonts?.[0]?.family) || '';

    // Build layout style instructions if provided
    let layoutInstructions = '';
    if (layoutStyle?.name) {
      layoutInstructions = `
LAYOUT STYLE: "${layoutStyle.name}"
${layoutStyle.cssGuidance || ''}
${layoutStyle.structureGuidance || ''}

CRITICAL: You MUST follow this specific layout style exactly. Do NOT default to a simple header-body-table layout. The layout style defines the visual structure — follow it precisely while applying the brand colors and fonts above.`;
    }

    const systemPrompt = `You are an expert ghostwriter and a senior professional in the user's target industry. Your task is to generate a highly professional, realistic 1-page document based on the specific asset type requested.

You will be provided with the user's Resume, the target Job Description, the target Company, and the specific "Asset Name" you need to generate. 

Constraints:
1. The output must be exactly one standard page in length (approximately 400-500 words).
2. Write the document as if the user is already employed at the target Company, demonstrating their competence by incorporating relevant skills from their Resume into the context of the Job Description.
3. Use standard professional formatting (headers, bullet points, paragraphs) appropriate for this specific type of document in this specific industry.
4. Output ONLY a complete, self-contained HTML document with inline CSS styling. No markdown, no explanations.
5. The HTML document must be print-friendly and look professional when rendered.

BRANDING (apply to the document):
- Primary color: ${primaryColor}
- Secondary color: ${secondaryColor}
- Accent color: ${accentColor}
${primaryFont ? `- Heading font: "${primaryFont}"` : ''}
${bodyFont ? `- Body font: "${bodyFont}"` : ''}

STYLE RULES:
- Use the company's brand colors for headers, borders, and accents
- Clean, professional layout with proper spacing
- Include a header with the document title and company name
- Print-friendly single-page design
${layoutInstructions}
${styleContext ? `\nUser style preferences:\n${styleContext}` : ''}

UNIQUENESS REQUIREMENT (CRITICAL — score ≥ 70% design variability):
Your document MUST be structurally and visually distinct from sibling documents in this portfolio. Aim for at least 70% uniqueness compared to each sibling. Vary:
- Overall page composition (columns, grids, sidebars vs linear flow)
- Header treatment (full-width bars vs minimal lines vs centered vs asymmetric)
- Data presentation (tables vs cards vs progress bars vs charts vs timelines)
- Section separators (borders, whitespace, background color blocks, dotted lines)
- Typography hierarchy and spacing patterns
Do NOT repeat the same header → paragraph → colored-block → table pattern across documents.
${siblingStructures?.length ? `\nEXISTING SIBLING DOCUMENTS (you must differentiate from these):\n${siblingStructures.map((s: { assetName: string; structureSummary: string }) => `--- ${s.assetName} ---\n${s.structureSummary}`).join('\n\n')}` : ''}`;

    const userPrompt = `Generate a "${assetName}" document.
${briefDescription ? `Description: ${briefDescription}` : ''}

Company: ${companyName || 'Unknown'}
Job Title: ${jobTitle || 'Unknown'}

Job Description:
${jobDescription}

${resumeText ? `User Resume:\n${resumeText}` : ''}

Output ONLY the complete HTML document.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('Generate dynamic asset error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
