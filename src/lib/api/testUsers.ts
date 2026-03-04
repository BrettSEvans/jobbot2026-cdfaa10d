import { supabase } from "@/integrations/supabase/client";
import type { PersonaProfile } from "@/contexts/ImpersonationContext";

export interface TestUserRow {
  id: string;
  admin_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  display_name: string | null;
  resume_text: string | null;
  years_experience: string | null;
  preferred_tone: string;
  key_skills: string[];
  target_industries: string[];
  created_at: string;
}

export async function fetchTestUsers(): Promise<TestUserRow[]> {
  const { data, error } = await (supabase as any)
    .from("test_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createTestUser(input: {
  first_name: string;
  last_name: string;
  display_name?: string;
}): Promise<TestUserRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await (supabase as any)
    .from("test_users")
    .insert({
      admin_id: user.id,
      first_name: input.first_name,
      last_name: input.last_name,
      display_name: input.display_name || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTestUser(
  id: string,
  updates: Partial<Omit<TestUserRow, "id" | "admin_id" | "created_at">>
): Promise<TestUserRow> {
  const { data, error } = await (supabase as any)
    .from("test_users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTestUser(id: string): Promise<TestUserRow | null> {
  const { data, error } = await (supabase as any)
    .from("test_users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function deleteTestUser(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("test_users")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export function testUserToPersona(row: TestUserRow): PersonaProfile {
  return {
    id: row.id,
    first_name: row.first_name,
    middle_name: row.middle_name,
    last_name: row.last_name,
    display_name: row.display_name,
    resume_text: row.resume_text,
    years_experience: row.years_experience,
    preferred_tone: row.preferred_tone || "professional",
    key_skills: row.key_skills || [],
    target_industries: row.target_industries || [],
    isTestUser: true,
  };
}
