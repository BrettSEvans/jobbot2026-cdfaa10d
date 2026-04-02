import { errorResponse } from "../_shared/errorResponse.ts";
import { aiFetchWithRetry, getModel } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baselineText, tailoredHtml, jobDescriptionMarkdown } = await req.json();

    if (!baselineText || baselineText.trim().length < 30) {
      return new Response(
        JSON.stringify({ success: false, error: 'Baseline resume text too short' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tailoredHtml || tailoredHtml.trim().length < 30) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tailored resume HTML too short' }),
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

    const systemPrompt = `You are a resume diff analysis engine. Compare the BASELINE resume against the TAILORED resume and produce a structured diff.

OUTPUT: Return valid JSON matching this exact schema (no markdown fences):

{
  "sections": [
    {
      "name": "Professional Summary",
      "status": "modified" | "added" | "removed" | "unchanged" | "reordered",
      "baseline_content": "original text",
      "tailored_content": "new text",
      "changes": [
        {
          "type": "keyword_injection" | "quantification" | "xyz_rewrite" | "reordered" | "removed" | "added" | "rephrased",
          "baseline_text": "original bullet or text",
          "tailored_text": "new bullet or text",
          "explanation": "Why this change was made",
          "fabrication_risk": false,
          "fabrication_reason": null
        }
      ]
    }
  ],
  "change_summary": "Plain English summary of all changes in 2-3 sentences. Transparent, collaborative tone.",
  "what_kept": "Summary of unchanged strengths and preserved content.",
  "stats": {
    "total_bullets_baseline": 0,
    "total_bullets_tailored": 0,
    "bullets_modified": 0,
    "bullets_added": 0,
    "bullets_removed": 0,
    "keywords_injected": 0,
    "sections_reordered": 0,
    "fabrication_flags": 0
  }
}

SECTION DETECTION: Group by standard resume sections (Contact Info, Professional Summary, Core Competencies/Skills, Experience entries, Education, Certifications, Projects).

FABRICATION DETECTION RULES:
- Flag if tailored adds a skill/cert/degree NOT present in baseline
- Flag if tailored invents metrics/numbers not in baseline
- Flag if tailored adds a job title or company not in baseline
- Do NOT flag rephrasing, keyword synonyms, or reordering as fabrication

CHANGE TYPE CLASSIFICATION:
- keyword_injection: Added exact terms from the job description
- quantification: Added or enhanced metrics/numbers
- xyz_rewrite: Restructured to "Accomplished X measured by Y by doing Z"
- reordered: Same content moved to different position
- rephrased: Rewritten for clarity without adding new claims
- added: Entirely new content
- removed: Baseline content dropped

${jobDescriptionMarkdown ? `\nJOB DESCRIPTION (for context on keyword injection detection):\n${jobDescriptionMarkdown.slice(0, 4000)}` : ''}`;

    const baselineTrunc = baselineText.slice(0, 6000);
    const tailoredTrunc = tailoredHtml.slice(0, 6000);

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: getModel('standard'),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `BASELINE RESUME (plain text):\n${baselineTrunc}\n\n---\n\nTAILORED RESUME (HTML):\n${tailoredTrunc}\n\nAnalyze and return the structured diff JSON now. Keep explanations concise (under 20 words each).`
        }
      ],
      temperature: 0.1,
      max_tokens: 12000,
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limited — try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errText = await response.text();
      throw new Error(`AI request failed (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    content = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();

    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      console.error('No JSON found in diff response:', content.slice(0, 300));
      throw new Error('Failed to parse diff result as JSON');
    }
    let clean = content.slice(firstBrace, lastBrace + 1);
    clean = clean.replace(/,\s*([}\]])/g, '$1');

    let diffResult;
    try {
      diffResult = JSON.parse(clean);
    } catch {
      const sanitized = clean.replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\t' ? ch : '');
      try {
        diffResult = JSON.parse(sanitized);
      } catch (e) {
        console.error('Failed to parse diff JSON:', (e as Error).message, 'snippet:', clean.slice(0, 500));
        throw new Error('Failed to parse diff result as JSON');
      }
    }

    const stats = diffResult.stats || {};
    const totalBullets = Math.max(stats.total_bullets_tailored || 1, 1);
    const trustScore = Math.round((1 - (stats.fabrication_flags || 0) / totalBullets) * 100);

    return new Response(
      JSON.stringify({
        success: true,
        diff: diffResult,
        trust_score: trustScore,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Resume diff error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'An internal error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
