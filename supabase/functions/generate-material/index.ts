import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Normalize asset type for cache key: lowercase, spaces→underscores */
function normalizeAssetType(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Fetch best practices from cache, research if stale/missing */
async function getBestPractices(
  supabaseAdmin: any,
  assetType: string,
  LOVABLE_API_KEY: string,
): Promise<{ best_practices: string; winning_patterns: any }> {
  const normalized = normalizeAssetType(assetType);

  // Check cache
  const { data: cached } = await supabaseAdmin
    .from('asset_best_practices')
    .select('*')
    .eq('asset_type', normalized)
    .maybeSingle();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  if (cached && cached.updated_at > thirtyDaysAgo) {
    return { best_practices: cached.best_practices, winning_patterns: cached.winning_patterns };
  }

  // Research best practices via AI
  let bestPracticesText = '';
  try {
    const researchResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert consultant who researches best practices for professional documents and deliverables.' },
          { role: 'user', content: `Research and provide comprehensive best practices for creating an excellent "${assetType}" document for a professional job context. Cover:
1. Optimal structure and sections
2. Content depth and specificity guidelines
3. Visual design and formatting principles
4. Common mistakes to avoid
5. What makes a great version vs a mediocre one

Be specific and actionable. Output as markdown.` },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });
    if (researchResp.ok) {
      const researchData = await researchResp.json();
      bestPracticesText = researchData.choices?.[0]?.message?.content || '';
    }
  } catch (e) {
    console.warn('Best practices research failed:', e);
  }

  // Analyze downloaded assets for winning patterns
  let winningPatterns: any = {};
  try {
    const { data: signals } = await supabaseAdmin
      .from('asset_download_signals')
      .select('application_id')
      .eq('asset_type', normalized)
      .order('created_at', { ascending: false })
      .limit(10);

    if (signals && signals.length >= 5) {
      // Fetch HTML from generated_assets for these applications
      const appIds = [...new Set(signals.map((s: any) => s.application_id))];
      const { data: assets } = await supabaseAdmin
        .from('generated_assets')
        .select('html, asset_name')
        .in('application_id', appIds)
        .ilike('asset_name', `%${assetType}%`)
        .not('html', 'eq', '')
        .limit(10);

      if (assets && assets.length >= 3) {
        const samples = assets.map((a: any) => a.html.slice(0, 2000)).join('\n---SAMPLE---\n');
        const patternResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Analyze HTML document samples and extract common structural/visual patterns.' },
              { role: 'user', content: `These ${assets.length} "${assetType}" documents were downloaded by users (approval signal). Extract winning patterns:\n\n${samples}\n\nReturn JSON with: { "common_sections": [], "visual_patterns": [], "content_patterns": [], "layout_approach": "" }` },
            ],
            temperature: 0.2,
            max_tokens: 2000,
          }),
        });
        if (patternResp.ok) {
          const patternData = await patternResp.json();
          const content = patternData.choices?.[0]?.message?.content || '';
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) winningPatterns = JSON.parse(jsonMatch[0]);
          } catch { /* use empty */ }
        }
      }
    }
  } catch (e) {
    console.warn('Pattern extraction failed:', e);
  }

  // Upsert cache
  const sampleCount = (winningPatterns?.common_sections?.length || 0);
  await supabaseAdmin.from('asset_best_practices').upsert({
    asset_type: normalized,
    best_practices: bestPracticesText,
    winning_patterns: winningPatterns,
    sample_count: sampleCount,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'asset_type' });

  return { best_practices: bestPracticesText, winning_patterns: winningPatterns };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      assetName,
      assetDescription,
      jobDescription,
      companyName,
      jobTitle,
      competitors,
      products,
      customers,
      applicationId,
    } = await req.json();

    if (!assetName || !jobDescription) {
      return new Response(
        JSON.stringify({ error: 'assetName and jobDescription are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Initialize admin client for best practices lookup
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch best practices + winning patterns
    const { best_practices, winning_patterns } = await getBestPractices(supabaseAdmin, assetName, LOVABLE_API_KEY);

    // Fetch existing assets for this application to enforce variability (80%+ uniqueness)
    let existingPatternsSection = '';
    if (applicationId) {
      const { data: existingAssets } = await supabaseAdmin
        .from('generated_assets')
        .select('asset_name, html')
        .eq('application_id', applicationId)
        .eq('generation_status', 'complete')
        .not('html', 'eq', '')
        .limit(20);

      if (existingAssets && existingAssets.length > 0) {
        const patternSummaries = existingAssets.map((a: any) => {
          // Extract structural fingerprint: tag hierarchy, CSS classes, layout containers
          const stripped = (a.html || '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/>[^<]+</g, '><')
            .slice(0, 1500);
          return `- ${a.asset_name}: ${stripped.slice(0, 500)}`;
        }).join('\n');

        existingPatternsSection = `\n\n## CRITICAL: Design Variability Requirement (80%+ uniqueness)
The following assets have ALREADY been generated for this application. Your output MUST be structurally DIFFERENT from all of them.
DO NOT reuse the same:
- Header/banner layout pattern
- Section arrangement (e.g. if others use "header → bold paragraph → grey block", use a different structure)
- Table/grid/list styling approach
- Color block patterns
- Typography hierarchy

Choose a DIFFERENT dominant layout pattern. Examples of distinct patterns:
- Timeline/chronological flow
- Scorecard/metric grid with KPI cards
- Executive brief with sidebar navigation
- Kanban/swimlane layout
- Infographic with icons and visual hierarchy
- Matrix/quadrant analysis
- Dashboard with charts and data panels

Existing asset structures to AVOID duplicating:
${patternSummaries}`;
      }
    }

    // Build best practices prompt section
    let bpSection = '';
    if (best_practices) {
      bpSection += `\n\n## Best Practices Research\n${best_practices}`;
    }
    if (winning_patterns && Object.keys(winning_patterns).length > 0) {
      bpSection += `\n\n## Patterns from High-Quality Examples (user-approved downloads)\n${JSON.stringify(winning_patterns, null, 2)}`;
    }

    const systemPrompt = `You are an expert consultant creating a professional "${assetName}" document.

ASSET DESCRIPTION: ${assetDescription || assetName}

OUTPUT: Return a single self-contained HTML document with embedded CSS. The document should be:
- Professional, clean, and printable
- Include a header with the company name, job title, and document title
- Well-structured with clear sections, tables, or visual elements as appropriate
- Specific to the role and company context — not generic
- Visually polished with modern styling

Company: ${companyName || 'Unknown'}
Job Title: ${jobTitle || 'Unknown'}
Competitors: ${(competitors || []).join(', ') || 'N/A'}
Products: ${(products || []).join(', ') || 'N/A'}
Customers: ${(customers || []).join(', ') || 'N/A'}
${bpSection}${existingPatternsSection}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Job Description:\n${(jobDescription || '').slice(0, 6000)}\n\nGenerate the "${assetName}" HTML document now.` },
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

    // Extract HTML
    content = content.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
    const htmlStart = content.indexOf('<!');
    if (htmlStart > 0) content = content.slice(htmlStart);
    const htmlEnd = content.lastIndexOf('</html>');
    if (htmlEnd !== -1) content = content.slice(0, htmlEnd + 7);

    return new Response(JSON.stringify({ success: true, html: content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Material generation error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
