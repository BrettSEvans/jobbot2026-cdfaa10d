/**
 * Generic revision CRUD factory.
 * Eliminates 6 near-identical revision files by parameterizing
 * the table name and content column.
 */

import { supabase } from '@/integrations/supabase/client';

export interface RevisionRecord {
  id: string;
  application_id: string;
  revision_number: number;
  label: string | null;
  created_at: string;
  [contentKey: string]: unknown;
}

export interface RevisionCrud {
  save: (applicationId: string, content: string, label?: string) => Promise<RevisionRecord>;
  getAll: (applicationId: string) => Promise<RevisionRecord[]>;
  remove: (id: string) => Promise<void>;
}

/**
 * Create save/getAll/remove functions for a specific revision table.
 *
 * @param tableName   - e.g. 'dashboard_revisions'
 * @param contentCol  - the column that holds the asset content, e.g. 'dashboard_html', 'html', 'cover_letter'
 */
export function createRevisionCrud(
  tableName: string,
  contentCol: string
): RevisionCrud {
  const save = async (
    applicationId: string,
    content: string,
    label?: string
  ): Promise<RevisionRecord> => {
    // Get next revision number
    const { data: latest } = await (supabase as any)
      .from(tableName)
      .select('revision_number')
      .eq('application_id', applicationId)
      .order('revision_number', { ascending: false })
      .limit(1)
      .single();

    const nextRevision = ((latest as any)?.revision_number ?? 0) + 1;

    const { data, error } = await (supabase as any)
      .from(tableName)
      .insert({
        application_id: applicationId,
        [contentCol]: content,
        label: label || `Revision ${nextRevision}`,
        revision_number: nextRevision,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as RevisionRecord;
  };

  const getAll = async (applicationId: string): Promise<RevisionRecord[]> => {
    const { data, error } = await (supabase as any)
      .from(tableName)
      .select('*')
      .eq('application_id', applicationId)
      .order('revision_number', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as RevisionRecord[];
  };

  const remove = async (id: string): Promise<void> => {
    const { error } = await (supabase as any)
      .from(tableName)
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  };

  return { save, getAll, remove };
}
