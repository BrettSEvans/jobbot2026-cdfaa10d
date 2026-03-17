import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10 imports per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 10) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 10 imports per hour." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { job_url, job_title, company_name, job_description } = body;

    if (!job_url) {
      return new Response(JSON.stringify({ error: "job_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate URL
    const { data: existing } = await supabase
      .from("job_applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("job_url", job_url)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "duplicate", existing_id: existing.id }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: app, error: insertError } = await supabase
      .from("job_applications")
      .insert({
        user_id: user.id,
        job_url,
        job_title: job_title || null,
        company_name: company_name || null,
        job_description_markdown: job_description || null,
        status: "draft",
        generation_status: "idle",
        pipeline_stage: "bookmarked",
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ id: app.id, message: "Application imported successfully" }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
