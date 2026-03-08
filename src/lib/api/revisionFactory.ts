/**
 * Generic revision CRUD factory.
 * Eliminates 6 near-identical revision files by parameterizing
 * the table name and content column.
 *
 * NOTE: Uses dynamic table names at runtime. Since the Supabase
 * typed client requires literal table names, we use the REST client
 * approach with explicit type assertions. All table names passed here
 * are validated at the call site (known revision tables in our schema).
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

// Use the untyped schema access for dynamic table names.
// This is intentional — revisionFactory is the ONE place where
// dynamic table names are required by design.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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
    const { data: latest } = await db
      .from(tableName)
      .select('revision_number')
      .eq('application_id', applicationId)
      .order('revision_number', { ascending: false })
      .limit(1)
      .single();

    const nextRevision = ((latest as RevisionRecord | null)?.revision_number ?? 0) + 1;

    const { data, error } = await db
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
    const { data, error } = await db
      .from(tableName)
      .select('*')
      .eq('application_id', applicationId)
      .order('revision_number', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as RevisionRecord[];
  };

  const remove = async (id: string): Promise<void> => {
    const { error } = await db
      .from(tableName)
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  };

  return { save, getAll, remove };
}
