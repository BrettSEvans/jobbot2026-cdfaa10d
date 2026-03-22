import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiFetchWithRetry } from "../_shared/aiRetry.ts";
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
    const researchResp = await aiFetchWithRetry(LOVABLE_API_KEY, {
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
        const patternResp = await aiFetchWithRetry(LOVABLE_API_KEY, {
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Analyze HTML document samples and extract common structural/visual patterns. Return JSON only.' },
            { role: 'user', content: `These ${assets.length} "${assetType}" documents were downloaded by users (approval signal). Extract winning patterns:\n\n${samples}\n\nReturn JSON with: { "common_sections": [], "visual_patterns": [], "content_patterns": [], "layout_approach": "" }` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 2000,
        });
        if (patternResp.ok) {
          const patternData = await patternResp.json();
          const content = patternData.choices?.[0]?.message?.content || '';
          try {
            winningPatterns = JSON.parse(content);
          } catch {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) winningPatterns = JSON.parse(jsonMatch[0]);
          }
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
      variabilityRecommendations,
      applicationCreatedAt,
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

        // Detect content flow patterns and layout types from existing assets
        const flowSummaries = existingAssets.map((a: any) => {
          const html = a.html || '';
          const hasGrid = /display:\s*grid|grid-template/i.test(html);
          const hasFlex = /display:\s*flex/i.test(html);
          const hasTwoCol = /grid-template-columns:\s*[^;]*\s+[^;]*|columns:\s*2|two-col|col-2/i.test(html);
          const hasTable = /<table/i.test(html);
          const hasChart = /chart|svg.*rect|canvas/i.test(html);
          const hasList = /<ul|<ol/i.test(html);
          const hasSidebar = /sidebar|aside|side-panel/i.test(html);
          const layoutType = hasSidebar ? 'sidebar' : hasTwoCol ? 'two-column' : hasGrid ? 'grid' : 'single-column';
          const blocks: string[] = [];
          if (/<h[12]/i.test(html)) blocks.push('header');
          if (/<p[>\s]/i.test(html)) blocks.push('paragraph');
          if (hasTable) blocks.push('table');
          if (hasList) blocks.push('bullet-list');
          if (hasChart) blocks.push('chart/visual');
          if (/callout|highlight|alert|badge/i.test(html)) blocks.push('callout-box');
          if (/metric|kpi|score/i.test(html)) blocks.push('metrics');
          if (/timeline/i.test(html)) blocks.push('timeline');
          return `- ${a.asset_name}: layout=${layoutType}, flow=${blocks.join(' → ')}`;
        }).join('\n');

        existingPatternsSection = `\n\n## CRITICAL: Design & Style Variability Requirement (80%+ uniqueness)
The following assets have ALREADY been generated for this application. Your output MUST be structurally AND stylistically DIFFERENT from all of them.

### Layout Types Already Used (DO NOT repeat):
${flowSummaries}

### Rules:
1. If existing assets use two-column layout, use single-column, sidebar, or centered layout instead
2. If existing assets use table-heavy content, use cards, timelines, or infographic style instead
3. Use a DIFFERENT content block sequence — if others go "header → paragraph → table → bullets", try "header → metrics grid → timeline → callout box"
4. Each document should tell the candidate's story from a DIFFERENT angle (strategic leader, analytical problem-solver, cross-functional collaborator, innovation driver)
5. Highlight DIFFERENT skills and competencies than other documents

Choose a DIFFERENT dominant layout pattern. Examples:
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

    // Build variability recommendations section
    let variabilitySection = '';
    if (variabilityRecommendations && Array.isArray(variabilityRecommendations) && variabilityRecommendations.length > 0) {
      variabilitySection = `\n\n## Design Variability Recommendations (from prior analysis)
Follow these specific recommendations to improve design diversity across this application's materials:
${variabilityRecommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

Apply these recommendations directly to the layout, structure, and visual approach of this document.`;
    }

    // Determine contextual date anchor
    const anchorDate = applicationCreatedAt ? new Date(applicationCreatedAt) : new Date();
    const anchorStr = anchorDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `You are an expert consultant creating a professional "${assetName}" document.

ASSET DESCRIPTION: ${assetDescription || assetName}

DATE CONTEXT: The application date is ${anchorStr}. Use this as your temporal anchor:
- For REPORTS, ASSESSMENTS, ANALYSES, or RETROSPECTIVE documents: use dates in the recent past relative to ${anchorStr}. Data, metrics, and findings should reference the weeks/months leading up to this date.
- For PLANS, ROADMAPS, STRATEGIES, or FORWARD-LOOKING documents: dates should start from ${anchorStr} and extend into the future (30/60/90 days, quarters, etc.).
- Always use realistic, specific dates (e.g. "Week of ${anchorStr}", "Q2 2026") — never use placeholder dates like "Month 1" or "TBD".

OUTPUT: Return a single self-contained HTML document with embedded CSS. The document MUST:
- Fit on EXACTLY ONE printed page (US Letter 8.5" x 11"). This is a HARD constraint — no exceptions.
- DO NOT generate more content than fits on a single page. Prefer fewer, higher-impact sections over trying to cover everything.
- Use compact but readable font sizes (9-10pt body, 12-13pt headings)
- The total rendered height MUST NOT exceed 900px. Use CSS: html, body { height: 10in; max-height: 10in; overflow: hidden; margin: 0; padding: 0.4in; box-sizing: border-box; }
- Use @page { size: letter; margin: 0; } to eliminate browser margins
- Keep to 3-5 sections maximum. Each section should be concise (2-4 bullet points or compact table rows).
- Use multi-column layouts (CSS grid/flexbox) to maximize horizontal space rather than vertical scrolling
- Be professional, clean, and printable
- Include a header with the company name, job title, and document title
- Specific to the role and company context — not generic
- Visually polished with modern styling

Company: ${companyName || 'Unknown'}
Job Title: ${jobTitle || 'Unknown'}
Competitors: ${(competitors || []).join(', ') || 'N/A'}
Products: ${(products || []).join(', ') || 'N/A'}
Customers: ${(customers || []).join(', ') || 'N/A'}
${bpSection}${existingPatternsSection}${variabilitySection}`;

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Job Description:\n${(jobDescription || '').slice(0, 6000)}\n\nGenerate the "${assetName}" HTML document now.` },
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

    // Extract HTML
    content = content.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
    const htmlStart = content.indexOf('<!');
    if (htmlStart > 0) content = content.slice(htmlStart);
    const htmlEnd = content.lastIndexOf('</html>');
    if (htmlEnd !== -1) content = content.slice(0, htmlEnd + 7);

    // Inject hard one-page constraint CSS to guarantee single-page output
    const onePageCss = `<style>@page{size:letter;margin:0}html,body{width:8.5in;max-height:10in;overflow:hidden;box-sizing:border-box}</style>`;
    if (content.includes('</head>')) {
      content = content.replace('</head>', `${onePageCss}</head>`);
    } else if (content.includes('<body')) {
      content = content.replace('<body', `${onePageCss}<body`);
    } else {
      content = onePageCss + content;
    }

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
