import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  resume_text: string | null;
  years_experience: string | null;
  target_industries: string[];
  key_skills: string[];
  preferred_tone: string;
}

export async function getProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    first_name: (data as any).first_name ?? null,
    last_name: (data as any).last_name ?? null,
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    resume_text: (data as any).resume_text ?? null,
    years_experience: (data as any).years_experience ?? null,
    target_industries: (data as any).target_industries ?? [],
    key_skills: (data as any).key_skills ?? [],
    preferred_tone: (data as any).preferred_tone ?? "professional",
  };
}

export async function updateProfile(updates: Partial<Omit<UserProfile, "id">>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update(updates as any)
    .eq("id", user.id);

  if (error) throw error;
}

export async function uploadResumePdf(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const path = `${user.id}/resume.pdf`;

  const { error } = await supabase.storage
    .from("resume-uploads")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });

  if (error) throw error;
  return path;
}

/**
 * Returns the profile context string for injection into AI prompts.
 * Includes both profile data and learned style preferences.
 * Returns empty string if no profile data is set.
 */
export async function getProfileContextForPrompt(): Promise<string> {
  try {
    const { getStyleContextForPrompt } = await import("@/lib/api/stylePreferences");
    
    const [profile, styleContext] = await Promise.all([
      getProfile(),
      getStyleContextForPrompt(),
    ]);

    const parts: string[] = [];

    if (profile) {
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.display_name;
      if (fullName) parts.push(`Name: ${fullName}`);
      if (profile.years_experience) parts.push(`Experience level: ${profile.years_experience}`);
      if (profile.target_industries?.length) parts.push(`Target industries: ${profile.target_industries.join(", ")}`);
      if (profile.key_skills?.length) parts.push(`Key skills & strengths: ${profile.key_skills.join(", ")}`);
      if (profile.preferred_tone) parts.push(`Preferred writing tone: ${profile.preferred_tone}`);
      if (profile.resume_text) parts.push(`\nResume / background:\n${profile.resume_text}`);
    }

    let result = "";
    if (parts.length > 0) {
      result = `\n\nAPPLICANT PROFILE (use this to personalize the output):\n${parts.join("\n")}`;
    }

    // Append learned style preferences
    if (styleContext) {
      result += styleContext;
    }

    return result;
  } catch {
    return "";
  }
}
