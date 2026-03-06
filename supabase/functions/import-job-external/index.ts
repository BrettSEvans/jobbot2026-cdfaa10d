import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT manually
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token", code: "AUTH_INVALID" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: 10 imports per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("pipeline_stage", "bookmarked")
      .gte("created_at", oneHourAgo);

    if (!countErr && (count || 0) >= 10) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded: 10 imports per hour", code: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { source, url, jobTitle, companyName, jobDescription } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "url is required", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the job application with bookmarked stage
    const { data: app, error: insertErr } = await supabase
      .from("job_applications")
      .insert({
        user_id: user.id,
        job_url: url,
        company_name: companyName || null,
        job_title: jobTitle || null,
        job_description_markdown: jobDescription || null,
        pipeline_stage: "bookmarked",
        status: "draft",
        generation_status: "idle",
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: insertErr.message, code: "INSERT_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, applicationId: app.id, source: source || "unknown" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("import-job-external error:", err);
    return new Response(
      JSON.stringify({ error: err.message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
