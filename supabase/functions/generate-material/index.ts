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

/**
 * Flow-safe one-page layout guard.
 * Key change: inner content uses overflow:visible + height:auto so text is NEVER clipped.
 * Only the outermost page-shell clips at the page boundary.
 */
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
    line-height: 1.35;
  }
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
    /* FLOW-SAFE: visible overflow so text is never clipped within content area */
    overflow: visible !important;
  }

  /* ===== FLOW-SAFE RULES: let text containers grow naturally ===== */
  .page-content *,
  .page-content *::before,
  .page-content *::after {
    /* REMOVED: overflow: hidden — this was clipping text */
    overflow: visible !important;
    overflow-x: visible !important;
    overflow-y: visible !important;
  }

  /* Tables need hidden overflow for cell containment only */
  .page-content table,
  .page-content td,
  .page-content th {
    overflow: hidden !important;
    word-wrap: break-word !important;
  }

  /* Strip ONLY absolute/fixed positioning — keep relative and static */
  .page-content *:not(svg *) {
    position: static !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    transform: none !important;
  }
  /* Allow relative positioning for controlled layout */
  .page-content [style*="position: relative"],
  .page-content [style*="position:relative"] {
    position: relative !important;
  }

  /* Headers: flow-safe, visible text, generous padding */
  .page-content header,
  .page-content .header,
  .page-content [class*="header"],
  .page-content [class*="banner"],
  .page-content [class*="hero"] {
    position: relative !important;
    overflow: visible !important;
    width: 100% !important;
    min-height: auto !important;
    height: auto !important;
    max-height: none !important;
    padding: 0.2in 0.25in !important;
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
    overflow: visible !important;
  }

  /* CRITICAL: All text containers must have auto height and visible overflow */
  .page-content div,
  .page-content section,
  .page-content article,
  .page-content .card,
  .page-content .frame,
  .page-content [class*="card"],
  .page-content [class*="frame"],
  .page-content [class*="section"],
  .page-content [class*="phase"],
  .page-content [class*="block"] {
    height: auto !important;
    max-height: none !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  /* Footers */
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
    overflow: hidden !important;
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
    overflow: visible !important;
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
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
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

// ====== DETERMINISTIC HTML AUDIT ======

interface AuditViolation {
  type: string;
  detail: string;
}

/**
 * Deterministic server-side audit for clipping/hidden-text risks.
 * Inspects the raw HTML/CSS for patterns known to cause text clipping.
 * Returns violations list (empty = pass).
 */
function auditHtmlForClipping(html: string): AuditViolation[] {
  const violations: AuditViolation[] = [];

  // Extract all inline styles from the generated content (not our guard)
  const guardEnd = html.indexOf('</style>');
  const contentAfterGuard = guardEnd > 0 ? html.slice(guardEnd) : html;

  // 1. Fixed height on text-containing elements (in inline styles within content)
  const fixedHeightPattern = /style="[^"]*(?:height:\s*\d+(?:px|pt|in|cm|em|rem)[^"]*)"[^>]*>(?:[^<]*<(?:p|span|li|h[1-6]|div)[^>]*>[^<]*)/gi;
  let match;
  while ((match = fixedHeightPattern.exec(contentAfterGuard)) !== null) {
    const styleStr = match[0];
    // Skip if it also has height:auto or min-height
    if (/height:\s*auto/i.test(styleStr)) continue;
    violations.push({ type: 'FIXED_HEIGHT', detail: `Fixed height on text container: ${styleStr.slice(0, 120)}` });
  }

  // 2. overflow:hidden in inline styles on content elements (not our guard style block)
  const inlineOverflowHidden = /style="[^"]*overflow\s*:\s*hidden[^"]*"/gi;
  const styleBlocks = contentAfterGuard.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  let ohMatch;
  while ((ohMatch = inlineOverflowHidden.exec(styleBlocks)) !== null) {
    violations.push({ type: 'INLINE_OVERFLOW_HIDDEN', detail: `Inline overflow:hidden found: ${ohMatch[0].slice(0, 120)}` });
  }

  // 3. Check embedded <style> blocks (not our guard) for overflow:hidden on content selectors
  const embeddedStyles = contentAfterGuard.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of embeddedStyles) {
    if (block.includes('lovable-one-page-guard')) continue;
    // Check for overflow:hidden on content selectors
    const ohInCss = block.match(/[^{]*\{[^}]*overflow\s*:\s*hidden[^}]*\}/gi) || [];
    for (const rule of ohInCss) {
      // Skip if it's on html/body (those are fine)
      if (/^[\s]*(html|body)\s*[,{]/i.test(rule)) continue;
      violations.push({ type: 'CSS_OVERFLOW_HIDDEN', detail: `CSS rule with overflow:hidden: ${rule.slice(0, 150)}` });
    }

    // Check for fixed heights on content selectors
    const fixedH = block.match(/[^{]*\{[^}]*(?:^|;|\s)height\s*:\s*\d+(?:px|pt|in|cm)[^}]*\}/gi) || [];
    for (const rule of fixedH) {
      if (/^[\s]*(html|body|\.page-shell)\s*[,{]/i.test(rule)) continue;
      if (/height\s*:\s*auto/i.test(rule)) continue;
      violations.push({ type: 'CSS_FIXED_HEIGHT', detail: `CSS rule with fixed height: ${rule.slice(0, 150)}` });
    }
  }

  // 4. max-height on content elements
  const maxHeightPattern = /max-height\s*:\s*\d+(?:px|pt|in|cm|em|rem)/gi;
  const maxHMatches = styleBlocks.match(maxHeightPattern) || [];
  for (const mh of maxHMatches) {
    violations.push({ type: 'MAX_HEIGHT', detail: `max-height found on content element: ${mh}` });
  }

  // 5. Absolute/fixed positioning in inline styles
  const absFixedPattern = /style="[^"]*position\s*:\s*(?:absolute|fixed)[^"]*"/gi;
  let afMatch;
  while ((afMatch = absFixedPattern.exec(styleBlocks)) !== null) {
    violations.push({ type: 'ABSOLUTE_POSITIONING', detail: `Absolute/fixed positioning: ${afMatch[0].slice(0, 120)}` });
  }

  return violations;
}

/**
 * Remove dangerous CSS patterns from the HTML before the AI review step.
 * This is a deterministic fix that strips known clipping causes.
 */
function stripClippingPatterns(html: string): string {
  let result = html;

  // Remove inline overflow:hidden from content elements (not our guard)
  // Only target style attributes, not our <style> block
  result = result.replace(
    /(<(?:div|section|article|header|p|span|li|ul|ol|h[1-6])[^>]*style="[^"]*?)overflow\s*:\s*hidden\s*;?\s*/gi,
    '$1'
  );

  // Remove fixed height from inline styles on text containers
  result = result.replace(
    /(<(?:div|section|article|header|p|span)[^>]*style="[^"]*?)(?:max-)?height\s*:\s*\d+(?:px|pt|in|cm|em|rem)\s*;?\s*/gi,
    (match, prefix) => {
      // Keep it if it's on an SVG, img, or explicit layout element
      if (/(?:svg|img|canvas|\.page-shell)/i.test(match)) return match;
      return prefix;
    }
  );

  // Remove absolute/fixed positioning from inline styles on content elements
  result = result.replace(
    /(<(?:div|section|article|header|footer|p|span|h[1-6])[^>]*style="[^"]*?)position\s*:\s*(?:absolute|fixed)\s*;?\s*/gi,
    '$1position: static; '
  );

  return result;
}

// --- Combined UI + QA review with up to 3 retry cycles + deterministic audit ---

const COMBINED_REVIEW_PROMPT = `You are a senior UI designer AND QA engineer reviewing a one-page printed HTML document (US Letter 8.5×11in, usable area ~9.2in tall × 7.5in wide after 0.4in/0.5in padding).

Run ALL of these checks:

**VISUAL/LAYOUT:**
1. OVERLAP: Elements whose text/background covers another element's content
2. HIDDEN TEXT: ANY text that is clipped, truncated, or invisible due to:
   - overflow:hidden on a container with fixed height that is too small for its content
   - Text extending below a div/section with a set max-height or height
   - Text same color as background
   - Text pushed off-screen by transforms or negative margins
   - Header/banner sections where text overflows the colored background area
   - Content blocks (cards, frames, sections) where the last lines of text are cut off
   To check: for EVERY container with overflow:hidden or a fixed height, verify that the text content fits within the available space. If the container has more text than fits, the text IS hidden.
3. OVERFLOW: Content extending beyond 11-inch page height
4. SPACING: Sections jammed together or headers touching body text
5. FONT SIZE: Any text smaller than 9pt (12px)

**STRUCTURAL/QA:**
6. FOOTER: Must be inside flex wrapper, never position:absolute/fixed, never covering content
7. HEADER: Background color area must be tall enough to fully contain ALL header text including subtitles. If header has a colored background, increase its padding/height so no text is clipped.
8. CSS SAFETY: No overflow:auto/scroll, no overflow:hidden on text containers (divs, sections, paragraphs), no position:absolute/fixed on content, no negative margins
9. READABILITY: Sufficient contrast, no placeholder text ("TBD", "[Insert]", "Lorem ipsum")
10. CONTENT: No mid-sentence cutoffs, no empty sections

RESPONSE FORMAT:
- If ALL checks pass with ZERO issues: respond with exactly "REVIEW_PASS" (nothing else)
- If ANY issues found: return the COMPLETE FIXED HTML. Fix rules:
  - For HIDDEN TEXT: REMOVE overflow:hidden and fixed heights from text containers. Use height:auto and overflow:visible.
  - For header clipping: increase header padding and use height:auto so all text is visible
  - For section/card clipping: remove fixed heights, use height:auto, remove overflow:hidden
  - Simplify layouts causing overlap (flatten nested grids, remove absolute positioning)
  - If content overflows the page, reduce bullet counts and merge sections — never use font below 9pt
  - Ensure every section has margin-bottom: 0.12in minimum
  - Footer inside flex column wrapper, never absolute/fixed
  - NEVER add overflow:hidden to any text container in your fix
  - Return ONLY raw HTML — no markdown fences, no explanations`;

const MAX_REVIEW_CYCLES = 3;

async function reviewPipeline(
  html: string,
  assetName: string,
  LOVABLE_API_KEY: string,
): Promise<{ html: string; reviewResults: { uiPassed: boolean; qaPassed: boolean; auditPassed: boolean; reviewCycles: number; violations: string[] } }> {
  let currentHtml = html;
  let cycles = 0;
  let lastViolations: string[] = [];

  for (let i = 0; i < MAX_REVIEW_CYCLES; i++) {
    cycles = i + 1;

    // Step 1: Deterministic audit — strip known clipping patterns first
    const preAuditViolations = auditHtmlForClipping(currentHtml);
    if (preAuditViolations.length > 0) {
      console.log(`Cycle ${cycles}: Pre-audit found ${preAuditViolations.length} violations, stripping clipping patterns`);
      currentHtml = stripClippingPatterns(currentHtml);
      // Re-enforce layout after stripping
      currentHtml = enforceOnePageLayout(currentHtml);
    }

    // Step 2: Post-strip audit
    const postAuditViolations = auditHtmlForClipping(currentHtml);
    const auditPassed = postAuditViolations.length === 0;
    lastViolations = postAuditViolations.map(v => `${v.type}: ${v.detail}`);

    if (!auditPassed) {
      console.log(`Cycle ${cycles}: Audit still has ${postAuditViolations.length} violations after strip:`, lastViolations.slice(0, 3));
    }

    // Step 3: AI review
    try {
      let violationContext = '';
      if (lastViolations.length > 0) {
        violationContext = `\n\nDETERMINISTIC AUDIT VIOLATIONS FOUND (you MUST fix these):\n${lastViolations.slice(0, 5).join('\n')}\n\nFix ALL of these by removing overflow:hidden from text containers, removing fixed heights, and using height:auto + overflow:visible instead.`;
      }

      const resp = await aiFetchWithRetry(LOVABLE_API_KEY, {
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: COMBINED_REVIEW_PROMPT },
          { role: 'user', content: `Document: "${assetName}" (Review cycle ${cycles}/${MAX_REVIEW_CYCLES})${violationContext}\n\nHTML to review:\n${currentHtml}` },
        ],
        temperature: 0.1,
        max_tokens: 5000,
      });

      if (!resp.ok) {
        console.warn(`Review cycle ${cycles} failed with status:`, resp.status);
        break;
      }

      const data = await resp.json();
      const result = (data.choices?.[0]?.message?.content || '').trim();

      if ((result === 'REVIEW_PASS' || result.startsWith('REVIEW_PASS')) && auditPassed) {
        console.log(`Review PASSED (AI + audit) on cycle ${cycles}/${MAX_REVIEW_CYCLES}`);
        return { html: currentHtml, reviewResults: { uiPassed: true, qaPassed: true, auditPassed: true, reviewCycles: cycles, violations: [] } };
      }

      if (result === 'REVIEW_PASS' || result.startsWith('REVIEW_PASS')) {
        // AI passed but audit failed — continue loop
        console.log(`Cycle ${cycles}: AI passed but audit failed with ${lastViolations.length} violations`);
        continue;
      }

      let fixed = result.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
      if (fixed.length > 200) {
        // Strip clipping patterns from AI's fix too
        fixed = stripClippingPatterns(fixed);
        currentHtml = enforceOnePageLayout(fixed);
        console.log(`Review cycle ${cycles}: issues found and fixed, ${i < MAX_REVIEW_CYCLES - 1 ? 'retrying...' : 'max cycles reached'}`);
      } else {
        console.log(`Review cycle ${cycles}: response too short, accepting current HTML`);
        break;
      }
    } catch (e) {
      console.warn(`Review cycle ${cycles} error:`, e);
      break;
    }
  }

  // Final audit check
  const finalViolations = auditHtmlForClipping(currentHtml);
  if (finalViolations.length > 0) {
    // One last deterministic strip attempt
    currentHtml = stripClippingPatterns(currentHtml);
    currentHtml = enforceOnePageLayout(currentHtml);
  }

  const finalAuditResult = auditHtmlForClipping(currentHtml);
  console.log(`Review completed after ${cycles} cycles — ${finalAuditResult.length === 0 ? 'audit clean' : `${finalAuditResult.length} residual violations`}`);

  return {
    html: currentHtml,
    reviewResults: {
      uiPassed: false,
      qaPassed: false,
      auditPassed: finalAuditResult.length === 0,
      reviewCycles: cycles,
      violations: finalAuditResult.map(v => `${v.type}: ${v.detail}`),
    },
  };
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
        { role: 'system', content: 'You are a document design consultant specializing in ONE-PAGE professional deliverables (US Letter 8.5×11in). Produce compact, constraint-driven rubrics — NOT verbose essays.' },
        { role: 'user', content: `Create a ONE-PAGE GENERATION RUBRIC for "${assetType}". Use this exact format (keep each line short, total under 250 words):

SECTIONS (max 3):
- [name]: [purpose, max 15 words]

CONTENT BUDGET:
- Header: max 2 lines
- Per section: max 3-4 bullets OR 1 short paragraph (2 sentences, 50 words max)
- Table rows: max 3-4
- Footer: max 1 line

ALLOWED LAYOUTS: single-column | two-column 60/40 | compact table + bullets | metric cards + body
BANNED: kanban, swimlanes, nested grids, absolute positioning, dense infographics, >3 body sections, overflow:hidden on text containers, fixed heights on content divs, framed/boxed section containers
VISUAL: 9-10pt body, 11-13pt headings, 0.15in section spacing, 80-85% page fill target
GREAT (3 bullets): ...
MISTAKES (3 bullets): ...` },
      ],
      temperature: 0.3,
      max_tokens: 1500,
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

// ====== STYLE FAMILY SYSTEM ======

interface StyleFamily {
  id: string;
  name: string;
  promptBlock: string;
  bestForTypes: string[];
}

function deriveComplementaryColor(hexOrCss: string): string {
  const hex = hexOrCss.replace(/^#/, '');
  if (hex.length !== 6 && hex.length !== 3) return '#2E7D6F';
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const rr = Math.round((r + 128) % 256 * 0.7 + 40);
  const gg = Math.round((g + 100) % 256 * 0.7 + 40);
  const bb = Math.round((b + 80) % 256 * 0.7 + 40);
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
}

function buildStyleFamilies(brandColors: string[]): StyleFamily[] {
  const primary = brandColors[0] || '#1a365d';
  const secondary = brandColors[1] || '#2d3748';
  const accent = brandColors[2] || '#e53e3e';
  const complementary = deriveComplementaryColor(primary);

  return [
    {
      id: 'A', name: 'Executive Bold',
      bestForTypes: ['strategy', 'plan', 'roadmap', 'executive', 'assessment', 'blueprint'],
      promptBlock: `## STYLE FAMILY A — "Executive Bold" (MANDATORY — follow exactly)
LAYOUT: Single-column body beneath a full-width dark header banner (background: ${primary}, white text).
GRID: One column. Sections stack vertically with 0.15in gaps.
COLOR RULE (60-30-10): 60% white page, 30% ${primary} on header + section accent bars, 10% ${accent} on metric highlights.
TYPOGRAPHY: Add <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Lato:wght@400;600&display=swap" rel="stylesheet"> in <head>.
Use font-family: 'Montserrat', sans-serif for ALL headings. Use font-family: 'Lato', sans-serif for body text.
SIGNATURE VISUAL (MANDATORY): Include a row of 3-4 metric cards. Each card: large bold number (24pt+), short label below (8pt), subtle left-border accent in ${accent}. Use display:flex; gap:0.15in.
NARRATIVE: Frame as strategic leadership — the candidate drives outcomes at org level.
WHITE SPACE: Generous padding (0.25in sides), section gaps 0.15in, no paragraph > 3 sentences.
ICONS: Use ▸ or ◆ instead of standard bullets.`,
    },
    {
      id: 'B', name: 'Modern Split',
      bestForTypes: ['communication', 'stakeholder', 'team', 'collaboration', 'template', 'cross-functional'],
      promptBlock: `## STYLE FAMILY B — "Modern Split" (MANDATORY — follow exactly)
LAYOUT: Two-column grid: 60% left (main narrative) + 40% right (colored sidebar). Use CSS grid: grid-template-columns: 1fr 0.7fr; gap: 0.2in.
COLOR RULE (60-30-10): 60% white main body, 30% ${secondary} sidebar background, 10% ${primary} for heading underlines + accent dots.
TYPOGRAPHY: Add <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;500&display=swap" rel="stylesheet"> in <head>.
Use font-family: 'Bebas Neue', sans-serif for headings (letter-spacing: 0.05em). Use font-family: 'Roboto', sans-serif for body.
SIGNATURE VISUAL (MANDATORY): The sidebar contains 4-5 quick-fact items. Each: ● marker in ${primary} + bold label + value. Sidebar has border-radius: 6px, padding: 0.2in.
NARRATIVE: Frame as cross-functional collaborator — breadth of impact across teams.
WHITE SPACE: Main column has 0.15in section gaps. Sidebar items spaced with 0.12in gaps.
ICONS: Use ● colored markers for sidebar items, ▸ for main body bullets.`,
    },
    {
      id: 'C', name: 'Clean Contrast',
      bestForTypes: ['report', 'analysis', 'brief', 'insight', 'review'],
      promptBlock: `## STYLE FAMILY C — "Clean Contrast" — DIFFERENT COLOR SCHEME (MANDATORY — follow exactly)
LAYOUT: Single-column. Sections alternate between white and light-tinted (${complementary}15) backgrounds.
COLOR RULE (60-30-10): 60% neutral #f8f9fa, 30% ${complementary} on alternate section backgrounds, 10% ${primary} accent text.
IMPORTANT: This family deliberately uses ${complementary} instead of the brand primary for its dominant color.
TYPOGRAPHY: Add <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=EB+Garamond:wght@400;500&display=swap" rel="stylesheet"> in <head>.
Use font-family: 'Playfair Display', serif for headings. Use font-family: 'EB Garamond', serif for body.
SIGNATURE VISUAL (MANDATORY): Include ONE pull-quote callout between sections. Style: font-style: italic; font-size: 13pt; border-left: 4px solid ${complementary}; padding-left: 0.15in; margin: 0.12in 0.
NARRATIVE: Frame as thought leader — unique industry perspective and expertise.
WHITE SPACE: Extra generous — 0.2in section gaps, narrow text column (max-width: 6.5in centered).
ICONS: Use minimal ◇ or → markers.`,
    },
    {
      id: 'D', name: 'Data Storyteller',
      bestForTypes: ['matrix', 'comparison', 'log', 'tracker', 'scorecard', 'audit', 'benchmark', 'risk', 'raid'],
      promptBlock: `## STYLE FAMILY D — "Data Storyteller" — TABLE-FOCUSED (MANDATORY — follow exactly)
LAYOUT: Header banner + ONE styled data table + 2 short bullet sections below.
COLOR RULE (60-30-10): 60% white, 30% ${primary} on table header + header banner, 10% #E8913A warm accent on key data points.
TYPOGRAPHY: Add <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet"> in <head>.
Use font-family: 'Montserrat', sans-serif for headings. Use font-family: 'DM Sans', sans-serif for body/table text.
SIGNATURE VISUAL (MANDATORY — TABLE REQUIRED):
Include a STYLED HTML TABLE with:
- 3-4 data rows (never more than 4)
- Header row: background: ${primary}; color: white; font-weight: 700; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.05em
- Body rows: alternating white / #f7f7f7
- Cell padding: 6px 10px; border-collapse: collapse; border: 1px solid #e2e2e2
- Table cells: MAX 8 words each, use fragments not sentences
NARRATIVE: Frame as analytical problem-solver — structured thinking, evidence-based.
WHITE SPACE: Table centered, max-width: 95%. Sections below have 0.12in gaps.
ICONS: Use ✓ ⚠ ● status markers in table cells.`,
    },
    {
      id: 'E', name: 'Visual Metrics',
      bestForTypes: ['dashboard', 'metrics', 'kpi', 'performance', 'progress', 'status', 'impact'],
      promptBlock: `## STYLE FAMILY E — "Visual Metrics" — CHART-FOCUSED (MANDATORY — follow exactly)
LAYOUT: Compact header + row of 3-4 visual metrics + 2 short narrative sections.
COLOR RULE (60-30-10): 60% #f5f5f5 page background, 30% ${secondary} on metric backgrounds, 10% #22C55E on progress fills and highlights.
TYPOGRAPHY: Add <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Lato:wght@400;600&display=swap" rel="stylesheet"> in <head>.
Use font-family: 'Bebas Neue', sans-serif for headings (letter-spacing: 0.08em). Use font-family: 'Lato', sans-serif for body.
SIGNATURE VISUAL (MANDATORY — CHARTS REQUIRED):
Include 3-4 CSS-ONLY visual metrics. Choose ONE:
OPTION A — Progress Bars: <div style="background:#e0e0e0;border-radius:5px;height:10px;width:100%"><div style="background:#22C55E;border-radius:5px;height:10px;width:78%"></div></div>
Below each: bold percentage (16pt) + label (8pt)
OPTION B — Donut Charts: <div style="width:60px;height:60px;border-radius:50%;background:conic-gradient(${accent} 0% 78%, #e0e0e0 78% 100%)"></div>
Arrange in flexbox row: display:flex; gap:0.2in; justify-content:space-between.
NARRATIVE: Frame as results-driven achiever — quantified outcomes, measurable impact.
WHITE SPACE: Metrics row gets 0.15in vertical margin. Body sections brief (3-4 bullets max).
ICONS: Use ↑ ↓ → trend markers next to metric labels.`,
    },
    {
      id: 'F', name: 'Editorial Minimal',
      bestForTypes: ['brief', 'summary', 'overview', 'narrative', 'proposal', 'vision', 'memo'],
      promptBlock: `## STYLE FAMILY F — "Editorial Minimal" (MANDATORY — follow exactly)
LAYOUT: Single narrow column (max-width: 6in, centered). Magazine-style reading experience.
COLOR RULE (60-30-10): 60% off-white #FAFAF8, 30% charcoal #2D2D2D on headings and horizontal rules, 10% ${primary} on one accent element.
TYPOGRAPHY: Add <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet"> in <head>.
Use font-family: 'Playfair Display', serif for headings. Use font-family: 'Source Sans 3', sans-serif for body.
SIGNATURE VISUAL (MANDATORY): One LARGE pull-quote: font-size: 16pt; font-style: italic; font-family: 'Playfair Display'; text-align: center; with thin 1px #2D2D2D horizontal rules above and below (margin: 0.15in 0).
NARRATIVE: Frame as innovation driver — forward-looking vision, creative solutions.
WHITE SPACE: Most generous of all families. Content centered, wide margins. Line-height: 1.5 for body.
ICONS: Use → for all bullet points. Minimal, elegant.`,
    },
  ];
}

function classifyAssetType(assetName: string, assetDescription: string): string {
  const combined = `${assetName} ${assetDescription}`.toLowerCase();
  if (/matrix|comparison|log|tracker|scorecard|audit|benchmark|risk|raid/.test(combined)) return 'analytical-table';
  if (/metric|kpi|performance|progress|status|impact|dashboard|score/.test(combined)) return 'analytical-chart';
  if (/strategy|plan|roadmap|executive|assessment|blueprint/.test(combined)) return 'strategic';
  if (/communication|stakeholder|team|collaborat|template|cross.?functional/.test(combined)) return 'communication';
  if (/report|analysis|brief|insight|review/.test(combined)) return 'analytical-report';
  return 'general';
}

function selectStyleFamily(
  families: StyleFamily[],
  assetName: string,
  assetDescription: string,
  usedFamilyIds: string[],
  regenerationCount: number,
  currentFamilyId?: string,
): StyleFamily {
  const assetType = classifyAssetType(assetName, assetDescription);
  const preferenceMap: Record<string, string[]> = {
    'analytical-table': ['D', 'A', 'B'],
    'analytical-chart': ['E', 'D', 'A'],
    'strategic': ['A', 'F', 'C'],
    'communication': ['B', 'C', 'F'],
    'analytical-report': ['C', 'D', 'F'],
    'general': ['F', 'B', 'A'],
  };
  const preferred = preferenceMap[assetType] || preferenceMap['general'];
  const excluded = new Set(usedFamilyIds);
  if (regenerationCount >= 2 && currentFamilyId) excluded.add(currentFamilyId);

  for (const fId of preferred) {
    if (!excluded.has(fId)) return families.find(f => f.id === fId)!;
  }
  for (const f of families) {
    if (!excluded.has(f.id)) return f;
  }
  return families.find(f => f.id === preferred[0])!;
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
      regenerationCount,
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

        existingPatternsSection = `\n\n## CRITICAL: Design & Style Variability Requirement (80%+ uniqueness)\nThe following assets have ALREADY been generated for this application. Your output MUST be structurally AND stylistically DIFFERENT from all of them.\n\n### Layout Types Already Used (DO NOT repeat):\n${flowSummaries}\n\n### Rules:\n1. If existing assets use two-column layout, use single-column or a different grid split\n2. If existing assets use table-heavy content, use bullet lists or metric cards instead\n3. Use a DIFFERENT content block sequence — vary the order of sections\n4. Each document should tell the candidate's story from a DIFFERENT angle (strategic leader, analytical problem-solver, cross-functional collaborator, innovation driver)\n5. Highlight DIFFERENT skills and competencies than other documents\n6. KEEP LAYOUTS SIMPLE — variety comes from content structure and color use, NOT from complex CSS layouts\n\nChoose a DIFFERENT but SIMPLE layout pattern. Examples:\n- Single-column with alternating section backgrounds\n- Two-column (60/40) with sidebar highlights\n- Clean table-based layout with clear headers\n- Metric cards row + bullet sections below\n- Timeline as a simple vertical list with date markers\n\nExisting asset structures to AVOID duplicating:\n${patternSummaries}`;
      }
    }

    // Normalize best practices into a compact generation rubric
    let bpSection = '';
    if (best_practices) {
      const trimmedBp = best_practices.length > 600 ? best_practices.slice(0, 600).replace(/\n[^\n]*$/, '') + '\n...' : best_practices;
      bpSection += `\n\n## Generation Rubric (one-page constraints)\n${trimmedBp}`;
    }
    if (winning_patterns && Object.keys(winning_patterns).length > 0) {
      const compactPatterns: Record<string, any> = {};
      if (winning_patterns.common_sections) compactPatterns.sections = winning_patterns.common_sections;
      if (winning_patterns.layout_approach) compactPatterns.layout = winning_patterns.layout_approach;
      if (winning_patterns.content_density) compactPatterns.density = winning_patterns.content_density;
      if (winning_patterns.visual_element) compactPatterns.visual = winning_patterns.visual_element;
      if (Object.keys(compactPatterns).length > 0) {
        bpSection += `\n\nWinning patterns: ${JSON.stringify(compactPatterns)}`;
      }
    }

    // ====== STYLE FAMILY SELECTION ======
    // Extract brand colors for style family building
    const brandColorsForFamilies: string[] = [];
    if (branding) {
      if (branding.colorPalette && Array.isArray(branding.colorPalette)) {
        brandColorsForFamilies.push(...branding.colorPalette);
      } else {
        if (branding.colors && typeof branding.colors === 'object') {
          Object.values(branding.colors).forEach((v: any) => { if (typeof v === 'string' && v.length < 60) brandColorsForFamilies.push(v); });
        }
        if (branding.extractedColors && typeof branding.extractedColors === 'object') {
          Object.values(branding.extractedColors).forEach((v: any) => { if (typeof v === 'string' && v.length < 60) brandColorsForFamilies.push(v); });
        }
      }
    }
    const families = buildStyleFamilies([...new Set(brandColorsForFamilies)].slice(0, 8));

    // Determine which families siblings already use
    let usedFamilyIds: string[] = [];
    if (applicationId) {
      const { data: siblingAssets } = await supabaseAdmin
        .from('generated_assets')
        .select('asset_name, html')
        .eq('application_id', applicationId)
        .eq('generation_status', 'complete')
        .not('html', 'eq', '')
        .neq('asset_name', assetName);

      if (siblingAssets) {
        usedFamilyIds = siblingAssets.map((a: any) => {
          const familyMatch = (a.html || '').match(/data-style-family="([A-F])"/);
          return familyMatch ? familyMatch[1] : '';
        }).filter(Boolean);
      }
    }

    const regenCount = typeof regenerationCount === 'number' ? regenerationCount : 0;
    const selectedFamily = selectStyleFamily(families, assetName, assetDescription || '', usedFamilyIds, regenCount);
    console.log(`Selected style family: ${selectedFamily.id} — ${selectedFamily.name} (regen=${regenCount}, used=${usedFamilyIds.join(',')})`);

    const styleFamilySection = `\n\n${selectedFamily.promptBlock}\n\nIMPORTANT: Add data-style-family="${selectedFamily.id}" to the <body> tag so the system can track which family was used.`;

    const anchorDate = applicationCreatedAt ? new Date(applicationCreatedAt) : new Date();
    const anchorStr = anchorDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build branding section for the prompt
    let brandingSection = '';
    if (branding) {
      const colors: string[] = [];
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

## DESIGN PHILOSOPHY: SIMPLICITY FIRST
Your #1 priority is a CLEAN, READABLE document with NO content overlap. Simple designs that render correctly are infinitely better than complex designs with broken layouts.

PREFER these simple, reliable layout patterns:
- Single-column with clear section headers and adequate spacing
- Two-column grid (equal or 60/40 split) using CSS grid with explicit gap
- Simple table with 3-5 rows
- Bullet-point sections with clear headings
- Clean header banner + body sections + footer

AVOID these complex patterns that frequently cause overlap:
- Multi-layer nested grids or complex CSS grid layouts
- Overlapping decorative elements or background shapes
- Kanban boards, swimlanes, or dashboard-style multi-panel layouts
- Complex infographics with many positioned elements
- Stacked cards with shadows that depend on precise spacing
- Any layout requiring more than 2 levels of nesting

## CONTENT BREVITY: LESS IS MORE
A clean, well-spaced document with 3 strong sections impresses more than a cramped document with 6 mediocre sections.
The document must fill the page but NOT overflow — aim for 80-85% page fill so it looks complete, not empty.
Follow these strict word limits:
- MAX 3 body sections (header + 3 sections + footer). Never exceed 3 body sections.
- Paragraph blocks: MAX 2 sentences (20-25 words each). No paragraph should exceed 50 words.
- Bullet lists: MAX 3-4 bullets per section. Each bullet MAX 12 words.
- Table cells: MAX 8 words per cell. Use fragments, not full sentences.
- Table rows: MAX 3-4 rows per table.
- Section headings: MAX 6 words.
- Executive summaries / introductions: MAX 2 sentences total.
- Footer text: MAX 1 line.
- Do NOT use framed/boxed section containers for "plan", "template", or "strategy" documents — use simple headers with underlines instead.
Prefer short, punchy phrases over elaborate explanations. White space is better than overflow.

## CRITICAL CSS RULES (violations will cause automatic rejection):
- NEVER use overflow: hidden, overflow: auto, or overflow: scroll on ANY content element (divs, sections, cards, frames, headers). Only the outermost page wrapper may clip.
- NEVER use fixed height or max-height on text-containing elements. Always use height: auto.
- NEVER use position: absolute or position: fixed on ANY element. Use normal document flow only.
- NEVER use negative margins or transform: translateY() to position content.
- ALL text containers MUST use: height: auto; overflow: visible;
- Header/banner sections MUST use generous padding (0.2in min) and height: auto so text is never clipped.

OUTPUT: Return a single self-contained HTML document with embedded CSS. The document MUST:
- Fit on EXACTLY ONE printed page (US Letter 8.5" x 11"). This is a HARD constraint — no exceptions.
- DO NOT generate more content than fits on a single page. When in doubt, write LESS. Shorter is always safer.
- NEVER use more than 3 body sections (header + 3 body sections + footer). Fewer sections = cleaner document.
- Reserve space for a footer when one is present. The footer must NEVER cover content.
- Titles must have at minimum 0.1in of clear space above them.
- Use compact but readable font sizes (9-10pt body, 11-13pt headings). NEVER use font sizes smaller than 9pt.
- All text in header/banner sections MUST be contained within the colored background area with generous padding.
- Keep header/banner sections compact: max 1.2in tall. Use a single background color with white text.
- Use this EXACT structure: <body><div class="page-wrapper"><div class="page-content">...main content...</div><footer>...footer...</footer></div></body>
- Use this EXACT CSS layout pattern:
  @page { size: letter; margin: 0; }
  html, body { width: 8.5in; height: 11in; margin: 0; padding: 0; overflow: hidden; }
  .page-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; padding: 0.4in 0.5in; box-sizing: border-box; }
  .page-content { flex: 1; min-height: 0; }
  footer, .page-footer { flex-shrink: 0; padding-top: 0.15in; border-top: 1px solid #ccc; font-size: 8pt; }
- The footer MUST be inside the flex wrapper, NOT position:absolute.
- The usable content area is approximately 9.2in tall × 7.5in wide after padding and footer reserve. Plan content to fill 80-85% of this — enough to look complete but with breathing room.
- Use generous spacing between sections (margin-bottom: 0.15in minimum).
- Be professional, clean, and printable
- Include a header with the company name, job title, and document title
- Specific to the role and company context — not generic

## Optional: ONE Simple Data Element
You MAY include ONE simple data element per document. Keep it minimal:
- Progress bars (CSS-only, max 3-4 bars)
- A compact table with 3-5 rows
- Simple metric cards (max 3-4 in a row using flexbox)
Use ONLY CSS-only visualizations. Avoid SVG charts. Maximum ONE per page. Keep under 1.2in tall.

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
      max_tokens: 4500,
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

    // Density check — detect risky output before review
    const sectionCount = (content.match(/<h[23][^>]*>/gi) || []).length;
    const bulletCount = (content.match(/<li[^>]*>/gi) || []).length;
    const tableRowCount = (content.match(/<tr[^>]*>/gi) || []).length;
    const textLength = content.replace(/<[^>]+>/g, '').length;
    const isDense = sectionCount > 4 || bulletCount > 16 || tableRowCount > 5 || textLength > 3000;

    if (isDense) {
      console.log(`Density detected: sections=${sectionCount}, bullets=${bulletCount}, rows=${tableRowCount}, chars=${textLength}. Running condensation retry.`);
      const condenseResp = await aiFetchWithRetry(LOVABLE_API_KEY, {
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `You are a document editor. The following HTML document is TOO DENSE for a single US Letter page. Condense it:
1. Merge sections down to max 3 body sections (combine related ones aggressively)
2. Cut bullet lists to max 3-4 bullets each (keep the most impactful)
3. Cut table rows to max 3-4 (keep highest-value rows)
4. Shorten all paragraphs to max 2 sentences, max 50 words per paragraph
5. Remove any section that is low-value or redundant
6. Remove all framed/boxed section containers — use simple headers with underlines instead
7. Keep ALL branding, colors, fonts intact
8. Use a SIMPLE single-column or two-column 60/40 layout
9. NEVER use overflow:hidden on any text container. Use height:auto and overflow:visible.
10. NEVER use fixed height or max-height on text-containing elements.
11. The document should fill 80-85% of the page — enough to look complete but not cramped.
12. Return ONLY the complete fixed HTML — no explanations, no markdown fences` },
          { role: 'user', content: content },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });
      if (condenseResp.ok) {
        const cd = await condenseResp.json();
        const condensed = (cd.choices?.[0]?.message?.content || '').trim();
        if (condensed.length > 200) {
          content = enforceOnePageLayout(condensed);
          console.log('Condensation applied successfully');
        }
      }
    }

    // Review pipeline: combined UI + QA Review + deterministic audit
    const { html: finalHtml, reviewResults } = await reviewPipeline(content, assetName, LOVABLE_API_KEY);
    content = finalHtml;

    return new Response(JSON.stringify({
      success: true,
      html: content,
      review: reviewResults,
    }), {
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
