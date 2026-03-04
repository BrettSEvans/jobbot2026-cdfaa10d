import { supabase } from "@/integrations/supabase/client";
import type { PersonaProfile } from "@/contexts/ImpersonationContext";
import { getActivePersonaSnapshot } from "@/contexts/ImpersonationContext";

export interface UserProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
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
    first_name: data.first_name ?? null,
    middle_name: data.middle_name ?? null,
    last_name: data.last_name ?? null,
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    resume_text: data.resume_text ?? null,
    years_experience: data.years_experience ?? null,
    target_industries: data.target_industries ?? [],
    key_skills: data.key_skills ?? [],
    preferred_tone: data.preferred_tone ?? "professional",
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
 * Build a profile context string from a PersonaProfile object.
 */
function buildProfileContext(persona: PersonaProfile): string {
  const parts: string[] = [];
  const fullName = [persona.first_name, persona.middle_name, persona.last_name].filter(Boolean).join(" ") || persona.display_name;
  if (fullName) parts.push(`Name: ${fullName}`);
  if (persona.years_experience) parts.push(`Experience level: ${persona.years_experience}`);
  if (persona.target_industries?.length) parts.push(`Target industries: ${persona.target_industries.join(", ")}`);
  if (persona.key_skills?.length) parts.push(`Key skills & strengths: ${persona.key_skills.join(", ")}`);
  if (persona.preferred_tone) parts.push(`Preferred writing tone: ${persona.preferred_tone}`);
  if (persona.resume_text) parts.push(`\nResume / background:\n${persona.resume_text}`);

  if (parts.length === 0) return "";
  return `\n\nAPPLICANT PROFILE (use this to personalize the output):\n${parts.join("\n")}`;
}

/**
 * Returns the profile context string for injection into AI prompts.
 * Automatically uses the active persona (test user or real user).
 * Includes both profile data and learned style preferences.
 * Returns empty string if no profile data is set.
 */
export async function getProfileContextForPrompt(): Promise<string> {
  try {
    // Check if we're impersonating — use that persona's data
    const activePersona = getActivePersonaSnapshot();

    let profileSection = "";

    if (activePersona?.isTestUser) {
      // Use the test user's data directly — no DB call needed
      profileSection = buildProfileContext(activePersona);
      // Skip style preferences for test users (they don't have learned styles)
      return profileSection;
    }

    // Normal flow: fetch from profiles table + style preferences
    const { getStyleContextForPrompt } = await import("@/lib/api/stylePreferences");

    const [profile, styleContext] = await Promise.all([
      getProfile(),
      getStyleContextForPrompt(),
    ]);

    if (profile) {
      const persona: PersonaProfile = {
        id: profile.id,
        first_name: profile.first_name,
        middle_name: profile.middle_name,
        last_name: profile.last_name,
        display_name: profile.display_name,
        resume_text: profile.resume_text,
        years_experience: profile.years_experience,
        preferred_tone: profile.preferred_tone,
        key_skills: profile.key_skills,
        target_industries: profile.target_industries,
        isTestUser: false,
      };
      profileSection = buildProfileContext(persona);
    }

    // Append learned style preferences
    if (styleContext) {
      profileSection += styleContext;
    }

    return profileSection;
  } catch {
    return "";
  }
}

/**
 * Get the resume text for the active persona (test user or real user).
 */
export async function getActiveResumeText(): Promise<string> {
  const activePersona = getActivePersonaSnapshot();
  if (activePersona?.isTestUser) {
    return activePersona.resume_text || "";
  }
  try {
    const profile = await getProfile();
    return profile?.resume_text || "";
  } catch {
    return "";
  }
}
