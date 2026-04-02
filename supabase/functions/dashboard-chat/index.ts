import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

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

    // Build context from dashboard data
    const sections = (dashData?.sections || []).map((s: any) => {
      let desc = `Section: ${s.title} — ${s.description}`;
      if (s.metrics?.length) {
        desc += `\nKPIs: ${s.metrics.map((m: any) => `${m.label}: ${m.value} (${m.change || "no change"})`).join(", ")}`;
      }
      if (s.charts?.length) {
        desc += `\nCharts: ${s.charts.map((c: any) => `${c.title} (${c.type})`).join(", ")}`;
      }
      return desc;
    }).join("\n\n");

    const scenarios = (dashData?.cfoScenarios || []).map((s: any) =>
      `Scenario: ${s.title} — ${s.description} (type: ${s.type})`
    ).join("\n");

    const systemPrompt = `You are an AI assistant for a business dashboard about ${meta.companyName || "a company"} for the role of ${meta.jobTitle || "a position"} in the ${meta.department || "department"}.

Answer questions about the dashboard data concisely and helpfully. Here is the dashboard content:

${sections}

${scenarios ? `\nScenario Analysis:\n${scenarios}` : ""}

Be specific when referencing data points. If the data doesn't contain what the user asks about, say so honestly.`;

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
