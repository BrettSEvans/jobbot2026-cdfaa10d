import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, branding, companyName, jobTitle, competitors, customers, products, department } = await req.json();

    if (!jobDescription) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brandingContext = branding ? `
Company Branding (use these EXACT design elements — match the company's actual website palette):
- Primary Colors: ${JSON.stringify(branding.colors || {})}
- CSS-Extracted Colors (from actual site CSS — USE THESE as ground truth): ${JSON.stringify(branding.extractedColors || {})}
- Fonts: ${JSON.stringify(branding.fonts || [])}
- CSS-Extracted Fonts (from actual site): ${JSON.stringify(branding.extractedFonts || [])}
- Typography: ${JSON.stringify(branding.typography || {})}
- Logo URL: ${branding.logo || branding.images?.logo || 'N/A'}
- Color Scheme Type: ${branding.colorScheme || 'light'}
- Spacing: ${JSON.stringify(branding.spacing || {})}
- Button Styles: ${JSON.stringify(branding.components || {})}

CRITICAL COLOR MATCHING: Look at the "CSS-Extracted Colors" and "Primary Colors" data above. The "dominant-1", "dominant-2", etc. entries are the most frequently used colors on the actual company website. Use these as your PRIMARY design palette. The "css-background-color", "css-color" entries show actual CSS property values from key selectors. Match these exactly in your dashboard design. If both Firecrawl branding colors and extracted colors exist, prefer the extracted colors as they come directly from the site's CSS.
` : 'No branding data available — use a clean, professional design with teal (#0a8080) and coral (#f45d48) accents.';

    const competitorContext = competitors?.length ? `\nKey Competitors: ${competitors.join(', ')}` : '';
    const customerContext = customers?.length ? `\nTarget Customers: ${customers.join(', ')}` : '';
    const productContext = products?.length ? `\nCompany Products: ${products.join(', ')}` : '';

    const systemPrompt = `You are an expert front-end developer and GTM strategist. You create stunning, self-contained HTML dashboards that demonstrate deep understanding of a company and role.

Your task: Generate a COMPLETE, standalone HTML file (with embedded CSS and JavaScript) that serves as a "Business Intelligence Dashboard" tailored to the job application. This dashboard should:

1. DESIGN: Match the company's branding (fonts, colors, design elements) using the provided branding data
2. STRUCTURE: Include a sidebar navigation, header, and multiple "chapters"/sections relevant to the role
3. CONTENT: Include realistic but fictional data that demonstrates understanding of:
   - The company's products and market position
   - Key metrics relevant to the ${department || 'GTM'} department
   - Competitor analysis with battlecards
   - Customer segments and target accounts
   - Revenue/pipeline analytics with Chart.js charts
4. INTERACTIVITY: Include Chart.js charts, clickable tables, toast notifications, and a chat modal
5. CLIPBOARD: Include a button that copies the entire HTML to clipboard
6. AGENTIC WORKFLOW TAB: Include a dedicated "Agentic Workflows" section/tab in the sidebar. This section should display a visual workflow diagram or card-based layout showing AI agents that complement the dashboard's domain. Each agent card should have: a name, icon/emoji, description of what it does, a "Run" button (simulated with a toast/notification), and status indicators (idle/running/complete). Customize the agents to match the role and department — for example, a Sales dashboard might include agents like "Lead Scorer", "Competitor Intel Gatherer", "Email Sequence Builder", "Deal Risk Analyzer", "Territory Optimizer". A Marketing dashboard might include "Content Analyzer", "SEO Auditor", "Campaign ROI Predictor", "Audience Segmenter". Connect agents in a visual pipeline/flow where outputs of one feed into another. Include at least 5-6 agents per dashboard. When "Run" is clicked, simulate a progress animation and show mock results.
7. CFO WHAT-IF SCENARIO VIEW: Include a dedicated "CFO View" section/tab in the sidebar. This section MUST contain exactly three interactive what-if scenario tools, each with adjustable sliders/inputs and a reactive Chart.js chart showing projected revenue impact over the next 3 quarters (Q1, Q2, Q3). The three tools should be:
   Tool 1 - "Pricing Impact Analyzer": Sliders for price change % (-30% to +30%), volume elasticity factor (0.5-2.0), and market growth rate (0%-15%). The chart updates in real-time showing projected revenue per quarter based on these variables.
   Tool 2 - "Headcount & Capacity Planner": Sliders for new hires per quarter (0-20), ramp time in months (1-6), and quota per rep. The chart shows projected pipeline and revenue contribution from the new capacity.
   Tool 3 - "Market Expansion Modeler": Inputs for new market TAM ($), expected penetration rate (1%-10%), and investment required ($). The chart shows projected incremental revenue vs. investment over 3 quarters with break-even indicator.
   Each tool should be in its own card with clear labels, current values displayed, and a responsive line or bar chart that updates instantly when any slider/input changes. Use realistic baseline numbers derived from the company context.

Use Chart.js from CDN: https://cdn.jsdelivr.net/npm/chart.js

${brandingContext}
${competitorContext}
${customerContext}
${productContext}

CRITICAL DATA & INTERACTION REQUIREMENTS:
- MOCK DATA VOLUME: Every data table MUST contain at least 500 rows of realistic, varied mock data. Generate the data programmatically in JavaScript (use loops with realistic randomization — names, dates, amounts, statuses, regions, product lines, etc.). Do NOT hard-code 500 rows in HTML — generate them in JS and render into the DOM.
- RESPONSIVE DESIGN: The entire dashboard MUST use a fully responsive layout. Use CSS Grid or Flexbox with media queries. On mobile, the sidebar collapses to a hamburger menu. Tables use horizontal scroll on small screens. Charts resize proportionally. All font sizes, padding, and margins scale appropriately.
- DRILL-DOWN FUNCTIONALITY: Every table MUST support drill-down. Clicking a row should expand or navigate to show related detail data. For example, clicking a customer row shows their deals; clicking a competitor shows their battlecard detail; clicking a product shows its metrics breakdown.
- CROSS-FILTERING / REACTIVE GRAPHS: When the user clicks a row or applies a filter on any table, at least one other chart or graph on the page MUST reactively update to reflect the new selection. For example: selecting a region in a table filters a revenue chart to that region; selecting a product filters the pipeline chart. Use JavaScript event listeners to connect tables and charts.
- INTELLIGENT SIZING (CRITICAL — DO NOT IGNORE): 
  * Every Chart.js canvas MUST be wrapped in a container div with a fixed max-height of 320px and overflow:hidden. The canvas itself must also have max-height:300px; width:100%.
  * Create all Chart.js instances with options: { responsive: true, maintainAspectRatio: false }.
  * Every data table MUST be wrapped in a scrollable container with max-height:400px; overflow-y:auto. The table scrolls internally — the page must NOT grow unbounded.
  * Each dashboard section/view MUST have overflow-y:auto on its main content wrapper so content scrolls within the section, NOT the entire page body.
  * The main content area (right of sidebar) must be height:100vh; overflow-y:auto.
  * Use CSS grid with constrained row heights to prevent any single chart or table from dominating the viewport.
  * NEVER let a chart grow taller than 320px or a table taller than 400px on screen. The dashboard must look polished on 1080p (1920x1080) with each section fitting or scrolling within its bounds.
- FUNCTIONAL SIDEBAR NAVIGATION: The sidebar MUST contain clearly labeled, visible text links for each dashboard section (e.g., "Overview", "Pipeline", "Competitors", "Customers", "Products", "Analytics", "Agentic Workflows", "CFO View"). Each link MUST be fully clickable and functional. Clicking a sidebar link MUST hide all other sections and show ONLY the corresponding section/view in the main content area on the right. Use JavaScript click handlers that toggle section visibility (display:none / display:block). The sidebar must highlight the currently active section. Do NOT use empty or placeholder hotspots — every sidebar item must have visible text and a working click handler. On mobile, the sidebar should collapse into a hamburger menu that still provides the same navigation functionality.

IMPORTANT RULES:
- Output ONLY the complete HTML file, starting with <!DOCTYPE html> and ending with </html>
- ALL CSS must be embedded in a <style> tag
- ALL JavaScript must be embedded in <script> tags
- The file must be completely self-contained and work when opened directly in a browser
- Use CSS variables for the design system
- Include at least 5-6 dashboard sections relevant to the role
- Include realistic metrics, charts, and data tables
- The dashboard title should reference "${companyName || 'the company'}" and the role "${jobTitle || 'the position'}"`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate a complete, self-contained HTML Business Intelligence Dashboard for this job application:\n\nCompany: ${companyName || 'Unknown'}\nRole: ${jobTitle || 'Unknown'}\nDepartment: ${department || 'GTM / Sales / Marketing'}\n\nJob Description:\n${jobDescription}`
          },
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    console.error('Dashboard generation error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
