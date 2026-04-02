const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { dashboardId, question, history } = await req.json();

    if (!dashboardId || !question) {
      return new Response(JSON.stringify({ error: "Missing dashboardId or question" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch dashboard data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: dashboard, error: dbError } = await supabase
      .from("live_dashboards")
      .select("dashboard_data, is_published")
      .eq("id", dashboardId)
      .eq("is_published", true)
      .maybeSingle();

    if (dbError || !dashboard) {
      return new Response(JSON.stringify({ error: "Dashboard not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dashData = dashboard.dashboard_data;
    const meta = dashData?.meta || {};

    // Build navigation context
    const navContext = (dashData?.navigation || []).map((n: any) =>
      `- Tab "${n.label}" (id: ${n.id}, icon: ${n.icon || "none"})`
    ).join("\n");

    // Build candidate context
    const candidate = dashData?.candidate;
    const candidateContext = candidate
      ? `Candidate: ${candidate.name}. Tagline: ${candidate.tagline || "N/A"}. LinkedIn: ${candidate.linkedIn || "N/A"}. Portfolio: ${candidate.portfolio || "N/A"}.`
      : "";

    // Build context from dashboard data
    const sections = (dashData?.sections || []).map((s: any) => {
      let desc = `Section: ${s.title} (navId: ${s.navId || s.id}) — ${s.description}`;
      if (s.metrics?.length) {
        desc += `\nKPIs: ${s.metrics.map((m: any) => `${m.label}: ${m.value} (${m.change || "no change"})`).join(", ")}`;
      }
      if (s.charts?.length) {
        desc += `\nCharts: ${s.charts.map((c: any) => `${c.title} (${c.type})`).join(", ")}`;
      }
      if (s.tables?.length) {
        desc += `\nTables: ${s.tables.map((t: any) => t.title).join(", ")}`;
      }
      return desc;
    }).join("\n\n");

    // Build scenario context with slider details
    const scenarios = (dashData?.cfoScenarios || []).map((s: any) => {
      let desc = `Scenario: ${s.title} — ${s.description} (type: ${s.type}, chart: ${s.chartType || "line"})`;
      if (s.sliders?.length) {
        desc += `\n  Sliders: ${s.sliders.map((sl: any) =>
          `${sl.label} (range: ${sl.min}-${sl.max}, default: ${sl.default}${sl.unit || ""})`
        ).join("; ")}`;
      }
      if (s.baseline) {
        desc += `\n  Baseline metrics: ${Object.entries(s.baseline).map(([k, v]) => `${k}: ${v}`).join(", ")}`;
      }
      return desc;
    }).join("\n");

    // Build agentic workforce context
    const agents = (dashData?.agenticWorkforce || []).map((a: any) =>
      `- Agent: ${a.name} — ${a.coreFunctionality} (teams: ${a.interfacingTeams})`
    ).join("\n");

    const tabPurposeMap = `
Tab Purpose Guide:
- The first/overview tab contains the Candidate Hero section and high-level KPIs summarizing key metrics.
- "CFO View" / scenario analysis tabs contain interactive what-if scenarios with adjustable sliders and projected charts.
- "Agentic Workforce" tab proposes AI agents that could augment the role. NOTE: This section is a Work in Progress — capabilities are being developed.
- Other tabs contain department-specific deep-dive sections with charts, tables, and detailed metrics.`;

    const systemPrompt = `You are an AI assistant for a business dashboard about ${meta.companyName || "a company"} for the role of ${meta.jobTitle || "a position"} in the ${meta.department || "department"}.

${candidateContext}

Dashboard Navigation Tabs:
${navContext || "No navigation tabs defined."}

${tabPurposeMap}

Dashboard Content by Section:

${sections}

${scenarios ? `\nScenario Analysis:\n${scenarios}` : ""}

${agents ? `\nAgentic Workforce (Work in Progress):\n${agents}` : ""}

Answer questions about the dashboard data concisely and helpfully. Use markdown formatting (bold, lists, headers) for readability. Be specific when referencing data points. If the data doesn't contain what the user asks about, say so honestly. You can explain what each tab contains and guide users to the right section.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ];

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 1024,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const answer = aiData.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("dashboard-chat error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
