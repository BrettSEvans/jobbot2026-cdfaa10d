import { supabase } from '@/integrations/supabase/client';

export interface SystemDocument {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch a system document by slug. Returns null on any error (failover-safe).
 */
export async function getSystemDocument(slug: string): Promise<SystemDocument | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('system_documents')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      console.warn(`[systemDocuments] Failed to fetch "${slug}":`, error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn(`[systemDocuments] Error fetching "${slug}":`, err);
    return null;
  }
}

/**
 * Update a system document's content. Admin-only (RLS enforced).
 */
export async function updateSystemDocument(
  slug: string,
  updates: { title?: string; content?: string }
): Promise<SystemDocument> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from('system_documents')
    .update({
      ...updates,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Fetch the generation guide content for injection into AI prompts.
 * Returns empty string on failure (never throws — generation continues without it).
 */
export async function getGenerationGuideForPrompt(): Promise<string> {
  try {
    const doc = await getSystemDocument('resume-cover-letter-guide');
    if (!doc?.content?.trim()) return '';
    return `\n\nGENERATION GUIDE (follow these strategies strictly):\n${doc.content}`;
  } catch {
    return '';
  }
}
