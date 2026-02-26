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
    const { jobDescription, branding, companyName, jobTitle, competitors, customers, products, department, templateHtml } = await req.json();

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

DESIGN SYSTEM — GOOGLE MATERIAL DESIGN 3 (MANDATORY):
Every dashboard MUST follow Google Material Design 3 (Material You) principles as the base design system. This means:
- Use Material Design 3 elevation system: surface tint colors, 5 elevation levels with tonal surface containers
- Use Material Design 3 typography scale: Display, Headline, Title, Body, Label sizes. Import Google Fonts "Roboto" and "Google Sans" (or "Product Sans" fallback to Roboto)
- Use Material Design 3 shape system: rounded corners (small: 8px, medium: 12px, large: 16px, extra-large: 28px)
- Use Material Design 3 color system: Generate a full tonal palette from the company's primary brand color using Material You dynamic color principles. Create --md-sys-color-primary, --md-sys-color-on-primary, --md-sys-color-primary-container, --md-sys-color-on-primary-container, --md-sys-color-surface, --md-sys-color-on-surface, --md-sys-color-surface-variant, --md-sys-color-outline, etc.
- Use Material Design 3 component patterns: FABs, filled/outlined/text buttons, cards with tonal surface, navigation rail/drawer, top app bar, chips, dialogs
- Use Material Icons from CDN: https://fonts.googleapis.com/icon?family=Material+Icons+Outlined
- COMBINE this Material Design 3 foundation with the company's scraped brand colors and fonts. The company's primary brand color becomes the seed color for the Material You tonal palette. If the company has custom fonts, use them for Display/Headline sizes while keeping Roboto for Body/Label.

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
5. AGENTIC WORKFORCE TAB (COMING SOON PAGE): Include a dedicated "Agentic Workforce" section/tab in the sidebar. This section is NOT a functional page — it is a forward-looking "Coming Soon" preview. It MUST include:
   - A prominent "Under Construction" / "Coming Soon" banner at the top with a construction icon/emoji (🚧) and a message like "Agentic Workforce — Coming Soon" with a brief subtitle about AI-powered agents being developed to augment the team.
   - Below the banner, display a styled data TABLE (not cards) listing AI agents that would help the department and role being applied for, as well as partner departments. The table MUST have exactly these 3 columns:
     * "Agent Name" — a creative, descriptive name for the agent (e.g., "Deal Risk Sentinel", "Competitive Intel Compiler", "Pipeline Forecast Engine")
     * "Core Functionality" — a 2-3 sentence description of what this agent does, its data sources, and its key outputs
     * "Primary Interfacing Teams" — a list of partner teams/departments this agent adds value to (e.g., "Sales, RevOps, Finance" or "Marketing, Product, Customer Success")
   - Include at least 8-10 agents in the table. Customize agents to match the specific role, department, and company context. Include agents for the primary department AND cross-functional agents that serve partner departments.
   - Style the table with the company branding. The entire page should feel polished but clearly communicate "not yet available" — use subtle muted tones or a slight opacity/grayscale effect on the table to reinforce the coming-soon feel.
   - Do NOT include any "Run" buttons, status indicators, or functional interactions. This is purely informational/aspirational.
6. CFO WHAT-IF SCENARIO VIEW: Include a dedicated "CFO View" section/tab in the sidebar. This section MUST contain exactly three interactive what-if scenario tools, each with adjustable sliders/inputs and a reactive Chart.js chart showing projected revenue impact over the next 3 quarters (Q1, Q2, Q3). The three tools should be:
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
- DATA VARIATION (CRITICAL): Every section's description text, metric labels, and card copy MUST be unique and contextual to that specific section. Do NOT reuse the same placeholder description across sections. Each section should feel hand-crafted with distinct insights, commentary, and narrative relevant to its topic. Vary the tone: some sections analytical, some action-oriented, some strategic. Mock data must have realistic distribution — not uniform. Include outliers, trends, seasonal patterns, and realistic variance in amounts, dates, and statuses.
- RESPONSIVE DESIGN: The entire dashboard MUST use a fully responsive layout. Use CSS Grid or Flexbox with media queries. On mobile, the sidebar collapses to a hamburger menu. Tables use horizontal scroll on small screens. Charts resize proportionally. All font sizes, padding, and margins scale appropriately.
- CHARTING (CRITICAL — READ CAREFULLY):
  * Use Chart.js from CDN for all charts.
  * Choose the BEST chart type for each dataset: bar charts for comparisons, line charts for trends over time, doughnut/pie for composition, radar for multi-dimensional scoring, scatter for correlations, stacked bar for part-to-whole over categories, area charts for cumulative trends. NEVER default to bar charts for everything.
  * GANTT CHART (MANDATORY): Include at least ONE Gantt-style timeline chart in a relevant section (e.g., "Project Roadmap", "Implementation Timeline", "Onboarding Plan", or "Strategic Initiatives"). Implement it as a HORIZONTAL BAR chart in Chart.js where the x-axis is time (dates/weeks/months) and each bar represents a task/initiative with its start and duration. Use the indexAxis:'y' option, and for each task provide a [start, end] data point using floating bars. Color-code bars by category/phase/team. Include at least 10-15 tasks/milestones grouped by phase. This should look like a professional project timeline.
  * SIZING: Each chart canvas MUST be inside a container div with style="height:380px; max-height:380px; position:relative;". The canvas gets width:100%; height:100%. Use Chart.js options: { responsive: true, maintainAspectRatio: false }.
  * Charts should be COMFORTABLE to read — not cramped. Give them breathing room with proper padding (at least 16px around each chart card). Use clear, readable font sizes for labels (12-14px) and titles (16-18px).
  * Use rich visual styling: gradient fills on area/bar charts, rounded bars (borderRadius: 6), subtle grid lines (color: 'rgba(0,0,0,0.06)'), custom tooltips with context, legend positioned for readability.
  * Each section should have 2-3 well-sized charts in a responsive grid (1-2 columns), NOT a wall of tiny cramped charts.
- DRILL-DOWN FUNCTIONALITY (CRITICAL):
  * CHART DRILL-DOWN: Clicking a segment/bar/point on any chart MUST open a detailed filtered view. Use Chart.js onClick handlers. When clicked, show a modal or slide-in panel containing: a filtered table of the underlying data for that segment, a more detailed breakdown chart, and summary statistics. Include a "Back" or "Close" button to return.
  * TABLE DRILL-DOWN: Clicking any table row MUST open a styled popup card/modal showing a detailed view of that record. The card should display ALL fields for that row in a clean, readable layout with labels and values. Include related data where relevant (e.g., clicking a customer shows their deals, activity timeline, and key metrics). Style the card with the company branding, rounded corners, subtle shadow, and a close button.
  * Both drill-down types must feel polished — use CSS transitions for opening/closing (fade + scale), and darken the background with an overlay.
- CROSS-FILTERING / REACTIVE GRAPHS: When the user clicks a row or applies a filter on any table, at least one other chart or graph on the page MUST reactively update to reflect the new selection. For example: selecting a region in a table filters a revenue chart to that region; selecting a product filters the pipeline chart. Use JavaScript event listeners to connect tables and charts.
- LAYOUT SIZING:
  * Every data table MUST be wrapped in a scrollable container with max-height:450px; overflow-y:auto. The table scrolls internally — the page must NOT grow unbounded.
  * Each dashboard section/view MUST have overflow-y:auto on its main content wrapper so content scrolls within the section, NOT the entire page body.
  * The main content area (right of sidebar) must be height:100vh; overflow-y:auto.
  * Use a comfortable layout grid — do NOT cram charts. Each chart card should have min-width:400px in a flex-wrap or CSS grid layout.
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

    const templateContext = templateHtml ? `

TEMPLATE INSTRUCTIONS: You have been provided a template dashboard HTML below. Use this template as the STRUCTURAL and LAYOUT basis for the new dashboard. Keep the same section layout, navigation structure, chart types, and interactive patterns. However, you MUST:
1. Replace ALL company-specific content (names, colors, branding, data) with the NEW company's information
2. Update CSS colors and fonts to match the new company's branding data provided above
3. Replace competitor names, product names, customer segments with the new company's data
4. Regenerate all mock data to be contextually relevant to the new role and company
5. Keep the template's design quality, interactivity, and drill-down patterns

TEMPLATE HTML:
${templateHtml.slice(0, 50000)}
` : '';
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
            content: `Generate a complete, self-contained HTML Business Intelligence Dashboard for this job application:\n\nCompany: ${companyName || 'Unknown'}\nRole: ${jobTitle || 'Unknown'}\nDepartment: ${department || 'GTM / Sales / Marketing'}\n\nJob Description:\n${jobDescription}${templateContext}`
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
