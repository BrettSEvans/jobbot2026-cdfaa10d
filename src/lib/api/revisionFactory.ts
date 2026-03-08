/**
 * Generic revision CRUD factory.
 * Eliminates 6 near-identical revision files by parameterizing
 * the table name and content column.
 *
 * NOTE: Uses dynamic table names at runtime, so we must use
 * typed helpers that accept string table names. The Supabase
 * JS client's `.from()` only accepts known table literals for
 * type inference. We use a thin wrapper with proper runtime safety.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

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
 * Helper to call supabase.from() with a dynamic table name.
 * This is safe because all callers pass known table names from our schema.
 */
function fromTable(name: string) {
  return supabase.from(name as TableName);
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
    const { data: latest } = await fromTable(tableName)
      .select('revision_number')
      .eq('application_id', applicationId)
      .order('revision_number', { ascending: false })
      .limit(1)
      .single();

    const nextRevision = ((latest as RevisionRecord | null)?.revision_number ?? 0) + 1;

    const { data, error } = await fromTable(tableName)
      .insert({
        application_id: applicationId,
        [contentCol]: content,
        label: label || `Revision ${nextRevision}`,
        revision_number: nextRevision,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as RevisionRecord;
  };

  const getAll = async (applicationId: string): Promise<RevisionRecord[]> => {
    const { data, error } = await fromTable(tableName)
      .select('*')
      .eq('application_id', applicationId)
      .order('revision_number', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as unknown as RevisionRecord[];
  };

  const remove = async (id: string): Promise<void> => {
    const { error } = await fromTable(tableName)
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  };

  return { save, getAll, remove };
}
