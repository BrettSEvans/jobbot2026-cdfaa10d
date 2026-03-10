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
    const { user_id, utm_campaign } = await req.json();

    if (!user_id || !utm_campaign) {
      return new Response(
        JSON.stringify({ error: "user_id and utm_campaign are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the campaign exists and hasn't exceeded its cap
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from("campaigns")
      .select("id, max_signups, utm_campaign")
      .eq("utm_campaign", utm_campaign)
      .limit(1)
      .maybeSingle();

    if (campErr || !campaign) {
      return new Response(
        JSON.stringify({ confirmed: false, reason: "campaign_not_found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.max_signups !== null) {
      const { count } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .filter("referral_source->>utm_campaign", "eq", utm_campaign);

      if ((count ?? 0) >= campaign.max_signups) {
        return new Response(
          JSON.stringify({ confirmed: false, reason: "cap_exceeded" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Auto-confirm the user's email via Admin API
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { email_confirm: true }
    );

    if (updateErr) {
      console.error("Failed to confirm user email:", updateErr);
      return new Response(
        JSON.stringify({ confirmed: false, reason: "confirm_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ confirmed: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("confirm-campaign-signup error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
