import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiFetchWithRetry } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function normalizeAssetType(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function stripScriptsAndStyles(html: string): string {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .trim();
}

function extractHeadInner(html: string): string {
  return html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1]?.trim() || '';
}

function extractBodyInner(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) return bodyMatch[1].trim();

  return html
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .trim();
}

function unwrapKnownPageWrappers(html: string): string {
  return html
    .replace(/<div[^>]*class=["'][^"']*page-wrapper[^"']*["'][^>]*>/gi, '')
    .replace(/<div[^>]*class=["'][^"']*page-content[^"']*["'][^>]*>/gi, '')
    .replace(/<\/div>\s*$/i, (match) => match)
    .trim();
}

function extractFooterHtml(bodyInner: string): { bodyWithoutFooter: string; footerInner: string } {
  const footerMatch = bodyInner.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i)
    || bodyInner.match(/<div\b[^>]*class=["'][^"']*page-footer[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  if (!footerMatch) {
    return { bodyWithoutFooter: bodyInner.trim(), footerInner: '' };
  }

  const fullMatch = footerMatch[0];
  const footerInner = footerMatch[1]?.trim() || '';
  const bodyWithoutFooter = bodyInner.replace(fullMatch, '').trim();

  return { bodyWithoutFooter, footerInner };
}

function normalizeGeneratedHtml(raw: string): string {
  let content = (raw || '').trim();
  content = content.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

  const doctypeIndex = content.search(/<!doctype html>/i);
  if (doctypeIndex > 0) {
    content = content.slice(doctypeIndex);
  }

  const htmlEnd = content.search(/<\/html>\s*$/i);
  if (htmlEnd !== -1) {
    const closing = content.match(/<\/html>\s*$/i)?.[0] || '</html>';
    content = content.slice(0, htmlEnd + closing.length);
  }

  if (!/<html[\s>]/i.test(content) && !/<body[\s>]/i.test(content)) {
    content = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>${content}</body></html>`;
  } else if (!/<html[\s>]/i.test(content) && /<body[\s>]/i.test(content)) {
    content = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>${content}</html>`;
  }

  return content;
}

function enforceOnePageLayout(html: string): string {
  const normalized = normalizeGeneratedHtml(html);
  const originalHead = extractHeadInner(normalized);
  const originalBody = unwrapKnownPageWrappers(extractBodyInner(normalized));
  const { bodyWithoutFooter, footerInner } = extractFooterHtml(originalBody);

  const onePageCss = `
<style id="lovable-one-page-guard">
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    width: 8.5in !important;
    height: 11in !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: #fff;
  }
  body {
    display: block !important;
    font-size: 10pt;
    line-height: 1.3;
  }
  /* Reset ALL AI-generated height/overflow/position conflicts */
  body > * {
    height: auto !important;
    max-height: none !important;
  }
  body > .page-shell {
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    padding: 0.4in 0.5in 0.32in !important;
    gap: 0 !important;
  }
  .page-content {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }
  /* Kill ALL overflow:auto/scroll inside page-content */
  .page-content *,
  .page-content *::before,
  .page-content *::after {
    overflow: hidden !important;
    overflow-x: hidden !important;
    overflow-y: hidden !important;
  }
  /* CRITICAL: Prevent content block overlap — strip absolute/fixed positioning on ALL content elements */
  .page-content *:not(svg *) {
    position: static !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    transform: none !important;
    margin-top: revert !important;
  }
  /* Allow relative positioning only for controlled layout purposes */
  .page-content [style*="position: relative"],
  .page-content [style*="position:relative"] {
    position: relative !important;
  }
  /* Ensure headers contain their text within background areas */
  .page-content header,
  .page-content .header,
  .page-content [class*="header"],
  .page-content [class*="banner"],
  .page-content [class*="hero"] {
    position: relative !important;
    overflow: hidden !important;
    width: 100% !important;
  }
  .page-content header *,
  .page-content .header *,
  .page-content [class*="header"] *,
  .page-content [class*="banner"] *,
  .page-content [class*="hero"] * {
    position: static !important;
    max-width: 100% !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
  }
  /* Strip absolute/fixed positioning on footers */
  footer, .page-footer, [class*="footer"] {
    position: static !important;
    bottom: auto !important;
    left: auto !important;
    right: auto !important;
  }
  .page-footer {
    flex: 0 0 auto !important;
    margin-top: 0.14in;
    padding-top: 0.12in;
    border-top: 1px solid rgba(0,0,0,0.18);
    font-size: 8pt;
    line-height: 1.2;
  }
  .page-content footer,
  .page-content .page-footer {
    display: none !important;
  }
  .page-content .container,
  .page-content .content,
  .page-content .content-wrapper,
  .page-content .main-content,
  .page-content .main-wrapper,
  .page-content .layout,
  .page-content .grid-container,
  .page-content .two-column,
  .page-content .two-col,
  .page-content .columns,
  .page-content .left-panel,
  .page-content .right-panel,
  .page-content .sidebar,
  .page-content .main-panel,
  .page-content .page-wrapper {
    min-height: 0 !important;
    max-height: none !important;
    height: auto !important;
  }
  .page-content h1,
  .page-content h2,
  .page-content h3,
  .page-content h4,
  .page-content p,
  .page-content ul,
  .page-content ol,
  .page-content table,
  .page-content blockquote,
  .page-content .card,
  .page-content .callout,
  .page-content .callout-box,
  .page-content .section,
  .page-content .section-box,
  .page-content .timeline,
  .page-content .timeline-container {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .page-content p,
  .page-content ul,
  .page-content ol,
  .page-content table {
    margin-bottom: 0.06in !important;
  }
  .page-content ul,
  .page-content ol {
    padding-left: 0.16in !important;
  }
  .page-content img,
  .page-content svg,
  .page-content canvas {
    max-width: 100%;
    max-height: 1.8in;
  }
  .page-content table {
    width: 100%;
  }
  /* Prevent negative margins from causing overlap */
  .page-content div,
  .page-content section,
  .page-content article {
    margin-top: 0 !important;
    margin-bottom: 0.08in !important;
  }
  .page-content div:first-child,
  .page-content section:first-child {
    margin-top: 0 !important;
  }
</style>`;

  const footerBlock = footerInner
    ? `<footer class="page-footer">${footerInner}</footer>`
    : '';

  const safeHead = `${originalHead}\n${onePageCss}`.trim();
  const safeBody = `
<div class="page-shell">
  <div class="page-content">
    ${bodyWithoutFooter}
  </div>
  ${footerBlock}
</div>`.trim();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${safeHead}
</head>
<body>
  ${safeBody}
</body>
</html>`;
}

// --- Overflow detection and auto-condensation ---
async function detectAndCondense(
  html: string,
  assetName: string,
  LOVABLE_API_KEY: string,
): Promise<{ html: string; condensed: boolean }> {
  try {
    const checkResp = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are an expert layout auditor for one-page printed documents (US Letter 8.5×11in with 0.4in top/bottom and 0.5in side padding). The usable area is approximately 10.2in tall × 7.5in wide.

Evaluate whether the HTML content below fits on ONE page without overflow.

Consider:
- Number of sections and their content density
- Font sizes (body should be 9-11pt)
- Tables, lists, grids — estimate vertical space consumed
- Header height, footer height
- Multi-column layouts reduce vertical need

If the content FITS on one page: respond with exactly "FITS_OK" (nothing else).

If it OVERFLOWS: return a CONDENSED version of the full HTML document that fits on one page. Rules for condensing:
- Use font size 9pt or larger (never smaller than 9pt)
- If reducing font to 9pt still overflows, TRIM content: reduce bullet counts, merge sections, drop lower-priority details
- Keep the document professionally complete — it should not look cut off
- Keep the same visual style, colors, and branding
- The content should conclude logically and visibly — no hidden or clipped sections
- Maximum 5 content sections
- NEVER use overflow: auto/scroll on any element
- Return ONLY the HTML, no explanations or markdown fences`,
        },
        {
          role: 'user',
          content: `Document: "${assetName}"\n\nHTML:\n${html}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 6000,
    });

    if (!checkResp.ok) {
      console.warn('Overflow check failed with status:', checkResp.status);
      return { html, condensed: false };
    }

    const checkData = await checkResp.json();
    const result = (checkData.choices?.[0]?.message?.content || '').trim();

    if (result === 'FITS_OK' || result.startsWith('FITS_OK')) {
      return { html, condensed: false };
    }

    // AI returned condensed HTML — run it through enforceOnePageLayout
    let condensed = result.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
    if (condensed.length > 200) {
      condensed = enforceOnePageLayout(condensed);
      console.log('Overflow detected — condensed version applied');
      return { html: condensed, condensed: true };
    }

    return { html, condensed: false };
  } catch (e) {
    console.warn('Overflow detection error:', e);
    return { html, condensed: false };
  }
}

async function getBestPractices(
  supabaseAdmin: any,
  assetType: string,
  LOVABLE_API_KEY: string,
): Promise<{ best_practices: string; winning_patterns: any }> {
  const normalized = normalizeAssetType(assetType);

  const { data: cached } = await supabaseAdmin
    .from('asset_best_practices')
    .select('*')
    .eq('asset_type', normalized)
    .maybeSingle();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  if (cached && cached.updated_at > thirtyDaysAgo) {
    return { best_practices: cached.best_practices, winning_patterns: cached.winning_patterns };
  }

  let bestPracticesText = '';
  try {
    const researchResp = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert consultant who researches best practices for professional documents and deliverables.' },
        { role: 'user', content: `Research and provide comprehensive best practices for creating an excellent "${assetType}" document for a professional job context. Cover:\n1. Optimal structure and sections\n2. Content depth and specificity guidelines\n3. Visual design and formatting principles\n4. Common mistakes to avoid\n5. What makes a great version vs a mediocre one\n\nBe specific and actionable. Output as markdown.` },
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

  let winningPatterns: any = {};
  try {
    const { data: signals } = await supabaseAdmin
      .from('asset_download_signals')
      .select('application_id')
      .eq('asset_type', normalized)
      .order('created_at', { ascending: false })
      .limit(10);

    if (signals && signals.length >= 5) {
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
            { role: 'system', content: 'Analyze HTML document samples and extract common structural and visual patterns. Return JSON only.' },
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

  const sampleCount = winningPatterns?.common_sections?.length || 0;
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
      branding,
    } = await req.json();

    if (!assetName || !jobDescription) {
      return new Response(
        JSON.stringify({ error: 'assetName and jobDescription are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { best_practices, winning_patterns } = await getBestPractices(supabaseAdmin, assetName, LOVABLE_API_KEY);

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
          const stripped = stripScriptsAndStyles(a.html)
            .replace(/>[^<]+</g, '><')
            .slice(0, 1500);
          return `- ${a.asset_name}: ${stripped.slice(0, 500)}`;
        }).join('\n');

        const flowSummaries = existingAssets.map((a: any) => {
          const html = a.html || '';
          const hasGrid = /display:\s*grid|grid-template/i.test(html);
          const hasFlex = /display:\s*flex/i.test(html);
          const hasTwoCol = /grid-template-columns:\s*[^;]*\s+[^;]*|columns:\s*2|two-col|col-2/i.test(html);
          const hasTable = /<table/i.test(html);
          const hasChart = /chart|svg.*rect|canvas/i.test(html);
          const hasList = /<ul|<ol/i.test(html);
          const hasSidebar = /sidebar|aside|side-panel/i.test(html);
          const layoutType = hasSidebar ? 'sidebar' : hasTwoCol ? 'two-column' : hasGrid ? 'grid' : hasFlex ? 'flex-layout' : 'single-column';

          const blocks: string[] = [];
          if (/<header|<h1|<h2/i.test(html)) blocks.push('header');
          if (/<p[>\s]/i.test(html)) blocks.push('paragraph');
          if (hasTable) blocks.push('table');
          if (hasList) blocks.push('bullet-list');
          if (hasChart) blocks.push('chart/visual');
          if (/callout|highlight|alert|badge/i.test(html)) blocks.push('callout-box');
          if (/metric|kpi|score/i.test(html)) blocks.push('metrics');
          if (/timeline/i.test(html)) blocks.push('timeline');

          return `- ${a.asset_name}: layout=${layoutType}, flow=${blocks.join(' → ') || 'mixed'}`;
        }).join('\n');

        existingPatternsSection = `\n\n## CRITICAL: Design & Style Variability Requirement (80%+ uniqueness)\nThe following assets have ALREADY been generated for this application. Your output MUST be structurally AND stylistically DIFFERENT from all of them.\n\n### Layout Types Already Used (DO NOT repeat):\n${flowSummaries}\n\n### Rules:\n1. If existing assets use two-column layout, use single-column, sidebar, centered, or asymmetric layout instead\n2. If existing assets use table-heavy content, use cards, timelines, or infographic style instead\n3. Use a DIFFERENT content block sequence — if others go "header → paragraph → table → bullets", try "header → metrics grid → timeline → callout box"\n4. Each document should tell the candidate's story from a DIFFERENT angle (strategic leader, analytical problem-solver, cross-functional collaborator, innovation driver)\n5. Highlight DIFFERENT skills and competencies than other documents\n6. Avoid body-level height math or layouts that depend on absolute-positioned footers; content must reserve space naturally for the footer\n\nChoose a DIFFERENT dominant layout pattern. Examples:\n- Timeline/chronological flow\n- Scorecard/metric grid with KPI cards\n- Executive brief with sidebar navigation\n- Kanban/swimlane layout\n- Infographic with icons and visual hierarchy\n- Matrix/quadrant analysis\n- Dashboard with charts and data panels\n\nExisting asset structures to AVOID duplicating:\n${patternSummaries}`;
      }
    }

    let bpSection = '';
    if (best_practices) {
      bpSection += `\n\n## Best Practices Research\n${best_practices}`;
    }
    if (winning_patterns && Object.keys(winning_patterns).length > 0) {
      bpSection += `\n\n## Patterns from High-Quality Examples (user-approved downloads)\n${JSON.stringify(winning_patterns, null, 2)}`;
    }

    let variabilitySection = '';
    if (variabilityRecommendations && Array.isArray(variabilityRecommendations) && variabilityRecommendations.length > 0) {
      variabilitySection = `\n\n## Design Variability Recommendations (from prior analysis)\nFollow these specific recommendations to improve design diversity across this application's materials:\n${variabilityRecommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}\n\nApply these recommendations directly to the layout, structure, and visual approach of this document.`;
    }

    const anchorDate = applicationCreatedAt ? new Date(applicationCreatedAt) : new Date();
    const anchorStr = anchorDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build branding section for the prompt
    let brandingSection = '';
    if (branding) {
      const colors: string[] = [];
      // Collect all available colors
      if (branding.colorPalette && Array.isArray(branding.colorPalette)) {
        colors.push(...branding.colorPalette);
      } else {
        if (branding.colors && typeof branding.colors === 'object') {
          Object.values(branding.colors).forEach((v: any) => {
            if (typeof v === 'string' && v.length < 60) colors.push(v);
          });
        }
        if (branding.extractedColors && typeof branding.extractedColors === 'object') {
          Object.values(branding.extractedColors).forEach((v: any) => {
            if (typeof v === 'string' && v.length < 60) colors.push(v);
          });
        }
      }
      const uniqueColors = [...new Set(colors)].slice(0, 8);

      const fonts: string[] = [];
      if (branding.fonts && Array.isArray(branding.fonts)) {
        branding.fonts.forEach((f: any) => { if (f?.family) fonts.push(f.family); });
      }
      if (branding.extractedFonts && Array.isArray(branding.extractedFonts)) {
        branding.extractedFonts.forEach((f: string) => fonts.push(f));
      }
      const uniqueFonts = [...new Set(fonts)].slice(0, 4);

      if (uniqueColors.length > 0 || uniqueFonts.length > 0) {
        brandingSection = `\n\n## Company Branding (MUST USE)\n`;
        if (uniqueColors.length > 0) {
          brandingSection += `Colors: ${uniqueColors.join(', ')}\n`;
          brandingSection += `Use at least 3 different brand colors across the document:\n`;
          brandingSection += `- Color 1 (${uniqueColors[0]}) for headers, section titles, and primary accents\n`;
          if (uniqueColors[1]) brandingSection += `- Color 2 (${uniqueColors[1]}) for backgrounds, borders, and secondary elements\n`;
          if (uniqueColors[2]) brandingSection += `- Color 3 (${uniqueColors[2]}) for highlights, callout boxes, and accent details\n`;
          brandingSection += `Do NOT use just one color — distribute the palette across the document in a similar pattern to their website.\n`;
        }
        if (uniqueFonts.length > 0) {
          const fontFamilies = uniqueFonts.map(f => `'${f}'`).join(', ');
          const googleFontsUrl = `https://fonts.googleapis.com/css2?${uniqueFonts.map(f => `family=${encodeURIComponent(f)}:wght@400;600;700`).join('&')}&display=swap`;
          brandingSection += `Fonts: ${uniqueFonts.join(', ')}\n`;
          brandingSection += `Add this in the <head>: <link href="${googleFontsUrl}" rel="stylesheet">\n`;
          brandingSection += `Use font-family: ${fontFamilies}, sans-serif for all text.\n`;
        }
      }
    }

    const systemPrompt = `You are an expert consultant creating a professional "${assetName}" document.

ASSET DESCRIPTION: ${assetDescription || assetName}

DATE CONTEXT: The application date is ${anchorStr}. Use this as your temporal anchor:
- For REPORTS, ASSESSMENTS, ANALYSES, or RETROSPECTIVE documents: use dates in the recent past relative to ${anchorStr}. Data, metrics, and findings should reference the weeks/months leading up to this date.
- For PLANS, ROADMAPS, STRATEGIES, or FORWARD-LOOKING documents: dates should start from ${anchorStr} and extend into the future (30/60/90 days, quarters, etc.).
- Always use realistic, specific dates (e.g. "Week of ${anchorStr}", "Q2 2026") — never use placeholder dates like "Month 1" or "TBD".

OUTPUT: Return a single self-contained HTML document with embedded CSS. The document MUST:
- Fit on EXACTLY ONE printed page (US Letter 8.5" x 11"). This is a HARD constraint — no exceptions.
- DO NOT generate more content than fits on a single page. If content risks overflow, condense aggressively, reduce bullet counts, shorten labels, and drop lower-priority details.
- NEVER use more than 5 content sections. If the document type demands more, merge sections.
- Reserve space for a footer when one is present. The footer must NEVER cover content.
- Titles must have at minimum 0.1in of clear space above them. Never position content at the very edge of the page.
- Use compact but readable font sizes (9-10pt body, 11-13pt headings). NEVER use font sizes smaller than 9pt.
- NEVER use overflow: auto, overflow: scroll, overflow-y: auto, or overflow-x: auto on ANY element. All content must be statically laid out.
- NEVER use position: absolute or position: fixed on ANY element including headers, footers, content blocks, or decorative elements. Everything must use normal document flow (position: static or relative only).
- NEVER use negative margins or transform: translateY() to position content — this causes blocks to overlap and become unreadable.
- All text in header/banner sections MUST be contained within the colored background area. Use padding inside the colored container, not absolute positioning of text outside it.
- Use this EXACT structure to prevent footer overlap: <body><div class="page-wrapper"><div class="page-content">...main content...</div><footer>...footer...</footer></div></body>
- Use this EXACT CSS layout pattern to prevent footer from covering content:
  @page { size: letter; margin: 0; }
  html, body { width: 8.5in; height: 11in; margin: 0; padding: 0; overflow: hidden; }
  .page-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; padding: 0.4in 0.5in; box-sizing: border-box; }
  .page-content { flex: 1; min-height: 0; overflow: hidden; }
  footer, .page-footer { flex-shrink: 0; padding-top: 0.15in; border-top: 1px solid #ccc; font-size: 8pt; }
- The footer MUST be inside the flex wrapper, NOT position:absolute. This ensures the main content area automatically shrinks to accommodate the footer.
- Never put height: calc(...) on the main content container to guess footer space.
- The usable content area is approximately 9.2in tall × 7.5in wide after padding and footer reserve. Plan content to fill 85-90% of this.
- Keep to 3-5 sections maximum. Each section should be concise (2-4 bullet points or compact table rows).
- Use multi-column layouts (CSS grid/flexbox) WITHIN .page-content to maximize horizontal space
- Be professional, clean, and printable
- Include a header with the company name, job title, and document title
- Specific to the role and company context — not generic
- Visually polished with modern styling

## Optional: Data Visualization Element
You MAY include ONE small data visualization element per document to increase visual variety. This is optional but encouraged when it adds analytical value. Options:
- Mini bar/column chart (inline SVG — <svg> with <rect> elements)
- Progress bars (CSS-only with percentage labels)
- Simple Gantt-style timeline (CSS grid or table-based)
- Compact data table with 3-5 rows
- Scorecard/KPI cards with metric values
- Donut/pie chart (inline SVG with <circle> and stroke-dasharray)
Use ONLY inline SVG or CSS-only visualizations — no external charting libraries. Maximum ONE per page. Keep compact (under 1.5in tall).

Company: ${companyName || 'Unknown'}
Job Title: ${jobTitle || 'Unknown'}
Competitors: ${(competitors || []).join(', ') || 'N/A'}
Products: ${(products || []).join(', ') || 'N/A'}
Customers: ${(customers || []).join(', ') || 'N/A'}
${brandingSection}${bpSection}${existingPatternsSection}${variabilitySection}`;

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Job Description:\n${(jobDescription || '').slice(0, 6000)}\n\nGenerate the "${assetName}" HTML document now.` },
      ],
      temperature: 0.5,
      max_tokens: 6000,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const errText = await response.text();
      throw new Error(`AI request failed (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    let content = enforceOnePageLayout(data.choices?.[0]?.message?.content || '');

    // Auto-retry: detect overflow and condense if needed
    const { html: finalHtml, condensed } = await detectAndCondense(content, assetName, LOVABLE_API_KEY);
    content = finalHtml;

    return new Response(JSON.stringify({ success: true, html: content, condensation_applied: condensed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Material generation error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
