import { supabase } from '@/integrations/supabase/client';

export interface ResumePromptStyle {
  id: string;
  label: string;
  slug: string;
  system_prompt: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get ALL prompt styles (admin view — includes inactive).
 */
export async function getAllResumeStyles(): Promise<ResumePromptStyle[]> {
  const { data, error } = await (supabase as any)
    .from('resume_prompt_styles')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Create a new prompt style.
 */
export async function createResumeStyle(style: {
  label: string;
  slug: string;
  system_prompt: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}): Promise<ResumePromptStyle> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from('resume_prompt_styles')
    .insert({ ...style, created_by: user?.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Update an existing prompt style.
 */
export async function updateResumeStyle(
  id: string,
  updates: Partial<Pick<ResumePromptStyle, 'label' | 'slug' | 'system_prompt' | 'description' | 'is_active' | 'sort_order'>>
): Promise<ResumePromptStyle> {
  const { data, error } = await (supabase as any)
    .from('resume_prompt_styles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a prompt style.
 */
export async function deleteResumeStyle(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('resume_prompt_styles')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Get all admin users (for user management).
 */
export async function getAdminUsers(): Promise<Array<{ id: string; user_id: string; role: string }>> {
  const { data, error } = await (supabase as any)
    .from('user_roles')
    .select('*')
    .eq('role', 'admin');
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Add a new admin by user ID.
 */
export async function addAdminRole(userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('user_roles')
    .insert({ user_id: userId, role: 'admin' });
  if (error) throw new Error(error.message);
}

/**
 * Remove admin role.
 */
export async function removeAdminRole(userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', 'admin');
  if (error) throw new Error(error.message);
}

/**
 * Look up a user ID by email (using profiles or auth).
 */
export async function lookupUserByEmail(email: string): Promise<string | null> {
  // We can't query auth.users from the client, so we check profiles
  // where display_name or some field might help. 
  // For now, we'll use an edge function approach or just note the limitation.
  // As a workaround, check if we can find via profiles table.
  const { data } = await (supabase as any)
    .from('profiles')
    .select('id')
    .limit(100);
  // This is a limitation — we'd need a server-side function to look up by email.
  // For now, return null and let the admin enter user IDs directly.
  return null;
}
