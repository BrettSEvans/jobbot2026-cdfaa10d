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
Company Branding (use these design elements):
- Color Scheme: ${JSON.stringify(branding.colors || {})}
- Fonts: ${JSON.stringify(branding.fonts || [])}
- Typography: ${JSON.stringify(branding.typography || {})}
- Logo URL: ${branding.logo || branding.images?.logo || 'N/A'}
- Color Scheme Type: ${branding.colorScheme || 'light'}
- Spacing: ${JSON.stringify(branding.spacing || {})}
- Button Styles: ${JSON.stringify(branding.components || {})}
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

Use Chart.js from CDN: https://cdn.jsdelivr.net/npm/chart.js

${brandingContext}
${competitorContext}
${customerContext}
${productContext}

IMPORTANT RULES:
- Output ONLY the complete HTML file, starting with <!DOCTYPE html> and ending with </html>
- ALL CSS must be embedded in a <style> tag
- ALL JavaScript must be embedded in <script> tags
- The file must be completely self-contained and work when opened directly in a browser
- Make it responsive (mobile-friendly)
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
