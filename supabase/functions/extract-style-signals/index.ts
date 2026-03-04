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

    const { user_message } = await req.json();
    if (!user_message || typeof user_message !== 'string' || user_message.length < 10) {
      return new Response(JSON.stringify({ signals: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to analyze the user's refinement message for style preferences
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ signals: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You analyze user refinement messages to extract reusable style preferences.

Given a user's instruction to refine an AI-generated document, extract any generalizable style preferences.

VALID CATEGORIES: tone, length, formatting, emphasis, vocabulary, structure

RULES:
- Only extract preferences that are REUSABLE across documents (not content-specific changes)
- "Change the title to X" is NOT a style preference (it's content-specific)
- "Make it more concise" IS a style preference (tone/length)
- "Use bullet points instead of paragraphs" IS a style preference (formatting)
- "Add more data-driven language" IS a style preference (vocabulary)
- "Keep sections shorter" IS a style preference (length)
- Assign confidence 0.5-0.8 based on how explicit the preference is
- Return EMPTY array if no style preferences detected

OUTPUT: ONLY valid JSON array, no markdown fences, no explanation.
Example: [{"category":"tone","preference":"concise and direct","confidence":0.7,"source_quote":"make it more concise"}]
Empty: []`
          },
          { role: 'user', content: user_message }
        ],
        temperature: 0.1,
      }),
    });

    if (!analysisResponse.ok) {
      console.warn('AI analysis failed:', analysisResponse.status);
      return new Response(JSON.stringify({ signals: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await analysisResponse.json();
    const content = aiResult.choices?.[0]?.message?.content?.trim() || '[]';

    let signals: Array<{
      category: string;
      preference: string;
      confidence: number;
      source_quote?: string;
    }> = [];

    try {
      const cleaned = content.replace(/^```json\s*\n?/, '').replace(/\n?\s*```$/, '');
      signals = JSON.parse(cleaned);
      if (!Array.isArray(signals)) signals = [];
    } catch {
      console.warn('Failed to parse AI signals output:', content);
      return new Response(JSON.stringify({ signals: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const VALID_CATEGORIES = ['tone', 'length', 'formatting', 'emphasis', 'vocabulary', 'structure'];
    const processedSignals: typeof signals = [];

    for (const signal of signals) {
      if (!VALID_CATEGORIES.includes(signal.category)) continue;
      if (!signal.preference) continue;
      if (signal.confidence < 0.5) continue;

      // Check if category already exists for this user
      const { data: existing } = await supabase
        .from('user_style_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', signal.category)
        .single();

      if (existing) {
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

    return new Response(JSON.stringify({ signals: processedSignals }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Extract style signals error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
