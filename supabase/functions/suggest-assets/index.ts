import { errorResponse } from "../_shared/errorResponse.ts";
import { aiFetchWithRetry } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { jobTitle, jobDescription, companyName, existingAssets } = await req.json();

    if (!jobDescription) {
      return new Response(JSON.stringify({ error: 'jobDescription is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const existingList = (existingAssets || []).join(', ');

    const resp = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are an expert career strategist. Given a job description, suggest 8-12 strategic professional documents/materials a candidate could create to stand out. These should be specific to the role, industry, and seniority level.

Examples of material types (adapt to the specific role):
- Stakeholder Map, 90-Day Plan, Technical Architecture Diagram, RAID Log, Competitive Analysis
- Market Entry Strategy, Customer Journey Map, Sales Playbook, Product Roadmap
- Risk Assessment Matrix, Budget Proposal, Team Org Chart, Process Improvement Plan
- Data Pipeline Architecture, Security Audit Checklist, Performance Dashboard Design
- Go-to-Market Strategy, Brand Audit, Content Calendar, Partnership Proposal

Do NOT suggest Resume, Cover Letter, or Dashboard — these are already generated separately.

Exclude any materials the candidate already has: ${existingList || 'none'}

Return ONLY valid JSON array of objects with "asset_name" and "brief_description" fields.
Each description should be 1-2 sentences explaining what it contains and why it's valuable for this role.`,
        },
        {
          role: 'user',
          content: `Job Title: ${jobTitle || 'Unknown'}
Company: ${companyName || 'Unknown'}

Job Description:
${(jobDescription || '').slice(0, 5000)}

Suggest strategic materials for this specific role.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 3000,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`AI request failed (${resp.status}): ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();
    let content = data.choices?.[0]?.message?.content || '';

    let suggestions;
    try {
      const parsed = JSON.parse(content);
      suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || parsed.assets || parsed.materials || Object.values(parsed)[0];
      if (!Array.isArray(suggestions)) suggestions = [];
    } catch {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }

    // Filter out any that match existing assets
    const existingLower = (existingAssets || []).map((a: string) => a.toLowerCase());
    suggestions = suggestions.filter((s: any) =>
      s.asset_name && s.brief_description &&
      !existingLower.includes(s.asset_name.toLowerCase())
    );

    return new Response(JSON.stringify({ success: true, suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Suggest assets error:', e);
    return new Response(JSON.stringify({ success: false, error: 'An internal error occurred' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
