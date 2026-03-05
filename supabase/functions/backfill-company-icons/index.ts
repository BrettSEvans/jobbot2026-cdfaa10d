import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from the JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find apps owned by this user with a company_name but no icon
    const { data: apps, error: fetchError } = await supabase
      .from('job_applications')
      .select('id, company_name, company_url')
      .eq('user_id', user.id)
      .is('company_icon_url', null)
      .not('company_name', 'is', null);

    if (fetchError) throw fetchError;
    if (!apps || apps.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: 'No applications need backfilling' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Backfilling icons for ${apps.length} applications`);

    let updated = 0;
    const searchIconUrl = `${supabaseUrl}/functions/v1/search-company-icon`;

    for (const app of apps) {
      try {
        const resp = await fetch(searchIconUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({ companyName: app.company_name, companyUrl: app.company_url }),
        });
        const result = await resp.json();
        if (result?.iconUrl) {
          await supabase
            .from('job_applications')
            .update({ company_icon_url: result.iconUrl })
            .eq('id', app.id);
          updated++;
          console.log(`Updated icon for ${app.company_name}: ${result.iconUrl}`);
        }
      } catch (e) {
        console.warn(`Failed to get icon for ${app.company_name}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated, total: apps.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('backfill-company-icons error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
