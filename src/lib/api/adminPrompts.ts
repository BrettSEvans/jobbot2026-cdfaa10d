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
  deleted_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---- Audit helper (fire-and-forget) ----

async function logAudit(action: string, targetId: string, metadata: Record<string, unknown> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('admin_audit_log')
      .insert([{ admin_id: user.id, action, target_id: targetId, metadata: metadata as unknown as Record<string, unknown> }]);
  } catch (err) {
    console.warn('[audit] Failed to log action:', action, err);
  }
}

// ---- Prompt Styles ----

export async function getAllResumeStyles(): Promise<ResumePromptStyle[]> {
  const { data, error } = await supabase
    .from('resume_prompt_styles')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function createResumeStyle(style: {
  label: string;
  slug: string;
  system_prompt: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}): Promise<ResumePromptStyle> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('resume_prompt_styles')
    .insert({ ...style, created_by: user?.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  logAudit('create_style', data.id, { label: data.label, slug: data.slug });
  return data;
}

export async function updateResumeStyle(
  id: string,
  updates: Partial<Pick<ResumePromptStyle, 'label' | 'slug' | 'system_prompt' | 'description' | 'is_active' | 'sort_order'>>
): Promise<ResumePromptStyle> {
  const { data, error } = await supabase
    .from('resume_prompt_styles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  logAudit('update_style', id, { ...updates });
  return data;
}

/** Soft-delete a prompt style (moves to trash). */
export async function deleteResumeStyle(id: string): Promise<void> {
  const { data: existing } = await supabase
    .from('resume_prompt_styles')
    .select('label, slug')
    .eq('id', id)
    .maybeSingle();
  const { error } = await supabase
    .from('resume_prompt_styles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  logAudit('delete_style', id, { label: existing?.label, slug: existing?.slug });
}

/** Restore a soft-deleted prompt style. */
export async function restoreResumeStyle(id: string): Promise<void> {
  const { error } = await supabase
    .from('resume_prompt_styles')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw new Error(error.message);
  logAudit('restore_style', id, {});
}

/** Permanently delete a prompt style (hard delete). */
export async function hardDeleteResumeStyle(id: string): Promise<void> {
  const { data: existing } = await supabase
    .from('resume_prompt_styles')
    .select('label, slug')
    .eq('id', id)
    .maybeSingle();
  const { error } = await supabase
    .from('resume_prompt_styles')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  logAudit('delete_style', id, { label: existing?.label, slug: existing?.slug, hard: true });
}

// ---- Admin Users ----

export async function getAdminUsers(): Promise<Array<{ id: string; user_id: string; role: string }>> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('role', 'admin');
  if (error) throw new Error(error.message);
  return data;
}

export async function addAdminRole(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role: 'admin' });
  if (error) throw new Error(error.message);
  logAudit('grant_admin', userId, { user_id: userId });
}

export async function removeAdminRole(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', 'admin');
  if (error) throw new Error(error.message);
  logAudit('revoke_admin', userId, { user_id: userId });
}

export async function lookupUserByEmail(email: string): Promise<string | null> {
  return null;
}

// ---- Audit Log ----

export async function getAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as unknown as AuditLogEntry[];
}
