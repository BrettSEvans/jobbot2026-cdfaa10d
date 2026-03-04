import { supabase } from "@/integrations/supabase/client";

export interface StylePreference {
  id: string;
  user_id: string;
  category: string;
  preference: string;
  confidence: number;
  times_reinforced: number;
  source_quote: string | null;
  created_at: string;
  updated_at: string;
}

export async function getStylePreferences(): Promise<StylePreference[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_style_preferences" as any)
    .select("*")
    .eq("user_id", user.id)
    .order("category");

  if (error) throw error;
  return (data || []) as unknown as StylePreference[];
}

export async function deleteStylePreference(id: string): Promise<void> {
  const { error } = await supabase
    .from("user_style_preferences" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function clearAllStylePreferences(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_style_preferences" as any)
    .delete()
    .eq("user_id", user.id);
  if (error) throw error;
}

/**
 * Format style preferences for injection into AI prompts.
 * Returns empty string if no preferences exist or all are low confidence.
 */
export async function getStyleContextForPrompt(): Promise<string> {
  try {
    const prefs = await getStylePreferences();
    const relevant = prefs.filter((p) => p.confidence >= 0.3);
    if (relevant.length === 0) return "";

    const lines = relevant.map((p) => {
      const strength = p.times_reinforced >= 5 ? " (strong preference)" : 
                       p.times_reinforced >= 3 ? " (established)" : "";
      return `- ${capitalize(p.category)}: ${p.preference}${strength}`;
    });

    return `\n\nUSER STYLE PREFERENCES (apply these automatically unless explicitly overridden):\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Process an AI response to extract and store style signals.
 * Returns the cleaned response with style_signals block removed.
 */
export async function processStyleSignals(aiResponse: string): Promise<{
  cleanedResponse: string;
  signals: Array<{ category: string; preference: string }>;
}> {
  try {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-style-signals`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ ai_response: aiResponse }),
      }
    );

    if (!resp.ok) {
      return { cleanedResponse: aiResponse, signals: [] };
    }

    const data = await resp.json();
    return {
      cleanedResponse: data.cleaned_response || aiResponse,
      signals: data.signals || [],
    };
  } catch {
    return { cleanedResponse: aiResponse, signals: [] };
  }
}
