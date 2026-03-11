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
  master_cover_letter: string | null;
  phone: string | null;
  linkedin_url: string | null;
}

export interface UserResume {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  is_active: boolean;
  uploaded_at: string;
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
    master_cover_letter: data.master_cover_letter ?? null,
    phone: data.phone ?? null,
    linkedin_url: data.linkedin_url ?? null,
  };
}

const ALLOWED_PROFILE_FIELDS = [
  "first_name", "middle_name", "last_name", "display_name",
  "resume_text", "years_experience", "target_industries",
  "key_skills", "preferred_tone", "master_cover_letter",
] as const;

export async function updateProfile(updates: Partial<Omit<UserProfile, "id">>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Whitelist fields to prevent injection of sensitive columns
  const safeUpdates: Record<string, unknown> = {};
  for (const key of ALLOWED_PROFILE_FIELDS) {
    if (key in updates) {
      safeUpdates[key] = (updates as Record<string, unknown>)[key];
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(safeUpdates)
    .eq("id", user.id);

  if (error) throw error;
}

export async function extractResumeText(storagePath: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("extract-resume-text", {
    body: { storagePath },
  });
  if (error) {
    console.error("Resume text extraction failed:", error);
    return "";
  }
  return data?.text || "";
}

export async function uploadResumePdf(file: File): Promise<UserResume> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const fileId = crypto.randomUUID();
  const path = `${user.id}/${fileId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("resume-uploads")
    .upload(path, file, { upsert: false, contentType: "application/pdf" });
  if (uploadError) throw uploadError;

  // Default display name = filename without extension
  const displayName = file.name.replace(/\.pdf$/i, "");

  // Insert DB record
  const { data, error: insertError } = await supabase
    .from("user_resumes")
    .insert({ user_id: user.id, file_name: displayName, storage_path: path, is_active: false })
    .select()
    .single();
  if (insertError) throw insertError;

  // Set as active
  await supabase.rpc("set_active_resume", { p_resume_id: data.id });

  // Auto-extract text from PDF and save to profile (non-blocking)
  extractResumeText(path).then(async (text) => {
    if (text) {
      try {
        await updateProfile({ resume_text: text });
      } catch (e) {
        console.error("Failed to save extracted resume text:", e);
      }
    }
  });

  return { ...data, is_active: true } as UserResume;
}

export async function listUserResumes(): Promise<UserResume[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_resumes")
    .select("*")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserResume[];
}

export async function setActiveResume(resumeId: string): Promise<void> {
  const { error } = await supabase.rpc("set_active_resume", { p_resume_id: resumeId });
  if (error) throw error;
}

export async function renameResume(resumeId: string, newName: string): Promise<void> {
  const { error } = await supabase
    .from("user_resumes")
    .update({ file_name: newName })
    .eq("id", resumeId);
  if (error) throw error;
}

export async function deleteResume(resumeId: string): Promise<void> {
  // Get the storage path first so we can clean up the file
  const { data: resume, error: fetchError } = await supabase
    .from("user_resumes")
    .select("storage_path")
    .eq("id", resumeId)
    .single();
  if (fetchError) throw fetchError;

  // Delete from storage (best-effort)
  const { error: storageError } = await supabase.storage
    .from("resume-uploads")
    .remove([resume.storage_path]);
  if (storageError) console.warn("Storage delete failed:", storageError);

  // Atomic DB delete + reassign active status
  const { error } = await supabase.rpc("delete_and_reassign_resume", { p_resume_id: resumeId });
  if (error) throw error;
}

export async function getActiveResumeStoragePath(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_resumes")
    .select("storage_path")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return data?.storage_path ?? null;
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
  const masterCL = 'master_cover_letter' in persona ? (persona as unknown as Record<string, unknown>).master_cover_letter as string | undefined : undefined;
  if (masterCL) parts.push(`\nMaster cover letter (use as voice/style reference — adapt content to the specific role):\n${masterCL}`);

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
      const persona: PersonaProfile & { master_cover_letter?: string | null } = {
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
        master_cover_letter: profile.master_cover_letter,
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
    if (profile?.resume_text) return profile.resume_text;

    // Backfill: if no resume_text but user has an active PDF, extract on demand
    const storagePath = await getActiveResumeStoragePath();
    if (storagePath) {
      const extracted = await extractResumeText(storagePath);
      if (extracted) {
        // Cache it so future calls don't re-extract
        await updateProfile({ resume_text: extracted }).catch(() => {});
        return extracted;
      }
    }
    return "";
  } catch {
    return "";
  }
}
