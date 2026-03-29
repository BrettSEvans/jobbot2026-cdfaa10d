import { errorResponse } from "../_shared/errorResponse.ts";
import { aiFetchWithRetry } from "../_shared/aiRetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescriptionMarkdown, companyName } = await req.json();

    if (!jobDescriptionMarkdown || jobDescriptionMarkdown.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job description too short (min 50 chars)' }),
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

    const systemPrompt = `You are an expert HR analyst and technical recruiter with 15 years of experience parsing job descriptions. Decompose the JD into structured intelligence categories.

CLASSIFICATION RULES:
1. MUST-HAVE: "required", "must have", "X+ years", "essential", in Requirements/Qualifications sections
2. PREFERRED: "preferred", "nice to have", "ideally", "bonus", "a plus"
3. BONUS: mentioned casually in "About you" sections without imperative language

EDGE CASE RULES:
1. Requirement in "Required" section but soft language ("familiarity with") → preferred
2. Years range ("3-5 years") → use lower bound for must_have threshold
3. Repeated in both Required and Nice-to-have → must_have (stricter wins)
4. Implicit requirements ("You will build microservices") → preferred unless stated elsewhere

FEW-SHOT EXAMPLES:

EXAMPLE 1 (Engineering):
JD: "Requirements: 5+ years Python. AWS experience preferred. GraphQL is a plus. BS required."
REASONING:
- "5+ years Python" → must_have (imperative, Requirements section, specific years) → hard_skill
- "AWS experience preferred" → preferred (explicit "preferred") → hard_skill
- "GraphQL is a plus" → bonus (explicit "a plus") → hard_skill
- "BS required" → must_have (explicit "required") → education

EXAMPLE 2 (Sales):
JD: "Must have 3+ years B2B SaaS sales. CRM experience (Salesforce preferred). MBA is a bonus."
REASONING:
- "3+ years B2B SaaS sales" → must_have (explicit "must have", years) → experience
- "CRM experience" → must_have (no qualifier in same sentence) → hard_skill
- "Salesforce preferred" → preferred (parenthetical qualifier) → hard_skill
- "MBA is a bonus" → bonus (explicit "bonus") → education

EXAMPLE 3 (Marketing):
JD: "We're looking for someone with strong SEO skills. HubSpot certification a plus. Must be comfortable with data analysis."
REASONING:
- "strong SEO skills" → must_have (imperative language "looking for") → hard_skill
- "HubSpot certification a plus" → bonus (explicit "a plus") → certification
- "data analysis" → must_have ("must be comfortable") → hard_skill

SENIORITY DETECTION — WEIGHTED EVIDENCE:
1. EXPLICIT YEARS (weight 5): "7+ years" → senior/staff; "1-3" → junior/mid; "15+" → director+
2. TITLE KEYWORDS (weight 4): "Staff", "Principal", "Lead", "Director", "VP", "Head of"
3. SCOPE LANGUAGE (weight 3):
   - IC: "implement", "write code", "design systems"
   - Lead: "mentor", "guide", "coach junior engineers"
   - Manager: "manage a team of", "hire and develop"
   - Director: "set strategy", "define roadmap", "cross-organizational"
   - Executive: "P&L responsibility", "board reporting"
4. REPORTING STRUCTURE (weight 2): "reports to CTO" = senior+; "reports to team lead" = junior/mid
5. AUTONOMY (weight 1): "independently" = mid+; "with guidance" = junior; "define the vision" = staff+

CONFLICT RESOLUTION:
- Years say "2" but title says "Senior": trust years → mid, confidence=0.6, flag "title inflation"
- Scope says "lead team" but years say "3": → team_lead/mid, confidence=0.7
- Always output reasoning explaining which signals you weighted

CULTURE SIGNAL TAXONOMY:
1. VALUES: "we value", "we believe in", "core values" → Route: cover_letter
2. WORK_STYLE: "fast-paced", "agile", "remote-first", "startup mentality" → Route: cover_letter + interview_prep
3. TEAM_DYNAMIC: "collaborative", "cross-functional", "autonomous" → Route: interview_prep
4. GROWTH: "growth opportunity", "learning culture", "promote from within" → Route: interview_prep
5. RED_FLAG (always extract):
   - "Wear many hats" + junior title = under-resourced
   - "Available 24/7" without comp mention
   - >15 required skills for mid-level
   - "Rock star", "ninja", "guru" = culture issues
   → Route: red_flag
Culture signals NEVER go on resumes. They are cover letter secret weapons.

KEYWORD EXTRACTION:
1. Extract EXACT phrases from the JD — do NOT paraphrase or synonym-swap
2. Prioritize multi-word technical terms over generic words
3. Include tool names exactly as written ("Kubernetes" not "K8s" unless JD says "K8s")
4. Rank by ATS importance:
   - TIER 1 (weight 3): In job title or first paragraph
   - TIER 2 (weight 2): In Requirements/Qualifications sections
   - TIER 3 (weight 1): In Nice-to-have or general description
5. Count frequency — keywords mentioned multiple times rank higher
6. Cap at 25 keywords

RED FLAG SCORING:
Severity weights: Low=1, Medium=2, High=3, Critical=5
Formula: job_health_score = max(0, 100 - sum(severity_weights))
Always return top 3 most severe flags with human-readable explanations.`;

    const response = await aiFetchWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Parse this job description into structured intelligence.\n\n${companyName ? `Company: ${companyName}\n\n` : ''}JOB DESCRIPTION:\n${jobDescriptionMarkdown.slice(0, 10000)}`
        }
      ],
      tools: [{
        type: "function",
        function: {
          name: "parse_jd",
          description: "Parse a job description into structured intelligence for downstream asset generation",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "1-2 sentence plain-English summary of the role" },
              job_function: { type: "string", description: "Primary function: engineering, sales, marketing, product, operations, design, data, finance, hr, legal, other" },
              department: { type: "string", description: "Department or team if identifiable" },
              requirements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    category: { type: "string", enum: ["must_have", "preferred", "bonus"] },
                    skill_type: { type: "string", enum: ["hard_skill", "soft_skill", "certification", "education", "experience"] }
                  },
                  required: ["text", "category", "skill_type"],
                  additionalProperties: false
                }
              },
              seniority: {
                type: "object",
                properties: {
                  level: { type: "string", enum: ["intern", "junior", "mid", "senior", "staff", "principal", "director", "vp", "c_suite"] },
                  years_min: { type: "number" },
                  years_max: { type: "number" },
                  management_scope: { type: "string", enum: ["ic", "team_lead", "manager", "director", "executive"] },
                  confidence: { type: "number", description: "0-1 confidence in seniority assessment" },
                  reasoning: { type: "string" }
                },
                required: ["level", "management_scope", "confidence", "reasoning"],
                additionalProperties: false
              },
              culture_signals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    signal_type: { type: "string", enum: ["value", "work_style", "team_dynamic", "growth", "red_flag"] },
                    route_to: { type: "string", enum: ["cover_letter", "interview_prep", "red_flag", "none"] }
                  },
                  required: ["text", "signal_type", "route_to"],
                  additionalProperties: false
                }
              },
              ats_keywords: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    keyword: { type: "string" },
                    tier: { type: "integer", description: "ATS importance tier: 1 (highest, in title/first paragraph), 2 (requirements section), 3 (nice-to-have)" },
                    frequency: { type: "number" },
                    is_in_title: { type: "boolean" }
                  },
                  required: ["keyword", "tier", "frequency", "is_in_title"],
                  additionalProperties: false
                }
              },
              red_flag_score: {
                type: "object",
                properties: {
                  score: { type: "number", description: "0-100 job health score" },
                  total_flags: { type: "number" },
                  top_alerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                        explanation: { type: "string" }
                      },
                      required: ["text", "severity", "explanation"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["score", "total_flags", "top_alerts"],
                additionalProperties: false
              },
              recommended_assets: {
                type: "array",
                description: "3-6 recommended strategic materials based on job function, seniority, and industry. Examples: RAID Log, Architecture Diagram, 90-Day Roadmap, Stakeholder Map, Competitive Battlecard, Territory Plan, Board Deck, Technical Debt Assessment, On-Call Runbook, Organizational Design.",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Asset name, e.g. 'RAID Log', 'Stakeholder Map'" },
                    brief_description: { type: "string", description: "1-2 sentence description of what this asset contains and why it's valuable for this role" }
                  },
                  required: ["name", "brief_description"],
                  additionalProperties: false
                }
              }
            },
            required: ["summary", "job_function", "department", "requirements", "seniority", "culture_signals", "ats_keywords", "red_flag_score", "recommended_assets"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "parse_jd" } }
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limited — try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errText = await response.text();
      throw new Error(`AI request failed (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let result;
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || '';
      try {
        result = JSON.parse(content);
      } catch {
        throw new Error('Failed to parse JD intelligence from AI response');
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('JD parse error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'An internal error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
