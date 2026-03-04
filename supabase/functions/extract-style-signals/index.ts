import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ai_response } = await req.json();
    if (!ai_response || typeof ai_response !== 'string') {
      return new Response(JSON.stringify({ signals: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract style_signals JSON block from AI response
    const signalMatch = ai_response.match(/```json\s*\n?\s*\{[\s\S]*?"style_signals"\s*:\s*\[[\s\S]*?\]\s*\}\s*\n?\s*```/);
    if (!signalMatch) {
      return new Response(JSON.stringify({ signals: [], cleaned_response: ai_response }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the signals
    let signals: Array<{
      category: string;
      preference: string;
      confidence: number;
      source_quote?: string;
    }> = [];

    try {
      const jsonStr = signalMatch[0]
        .replace(/^```json\s*\n?/, '')
        .replace(/\n?\s*```$/, '');
      const parsed = JSON.parse(jsonStr);
      signals = parsed.style_signals || [];
    } catch (e) {
      console.warn('Failed to parse style signals:', e);
      return new Response(JSON.stringify({ signals: [], cleaned_response: ai_response }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const VALID_CATEGORIES = ['tone', 'length', 'formatting', 'emphasis', 'vocabulary', 'structure'];
    const processedSignals: typeof signals = [];

    for (const signal of signals) {
      if (!VALID_CATEGORIES.includes(signal.category)) continue;
      if (!signal.preference) continue;
      if (signal.confidence < 0.5) continue; // Skip low confidence signals

      // Check if category already exists
      const { data: existing } = await supabase
        .from('user_style_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', signal.category)
        .single();

      if (existing) {
        // Same direction → reinforce; contradictory → replace
        const isSameDirection = existing.preference.toLowerCase().includes(signal.preference.toLowerCase().split(' ')[0]);
        
        if (isSameDirection) {
          await supabase
            .from('user_style_preferences')
            .update({
              confidence: Math.min(1, Number(existing.confidence) + 0.1),
              times_reinforced: existing.times_reinforced + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('user_style_preferences')
            .update({
              preference: signal.preference,
              confidence: signal.confidence,
              times_reinforced: 1,
              source_quote: signal.source_quote || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        }
      } else {
        // Enforce max 8 preferences per user
        const { data: allPrefs } = await supabase
          .from('user_style_preferences')
          .select('id, confidence')
          .eq('user_id', user.id)
          .order('confidence', { ascending: true });

        if (allPrefs && allPrefs.length >= 8) {
          // Remove lowest confidence
          await supabase
            .from('user_style_preferences')
            .delete()
            .eq('id', allPrefs[0].id);
        }

        await supabase
          .from('user_style_preferences')
          .insert({
            user_id: user.id,
            category: signal.category,
            preference: signal.preference,
            confidence: signal.confidence,
            source_quote: signal.source_quote || null,
          });
      }

      processedSignals.push(signal);
    }

    // Clean the response by removing the style_signals block
    const cleanedResponse = ai_response.replace(signalMatch[0], '').trim();

    return new Response(JSON.stringify({
      signals: processedSignals,
      cleaned_response: cleanedResponse,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Extract style signals error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
