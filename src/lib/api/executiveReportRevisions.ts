import { supabase } from '@/integrations/supabase/client';

export async function saveExecutiveReportRevision(applicationId: string, html: string, label?: string) {
  const { data: latest } = await supabase
    .from('executive_report_revisions' as any)
    .select('revision_number')
    .eq('application_id', applicationId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  const nextRevision = ((latest as any)?.revision_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('executive_report_revisions' as any)
    .insert({
      application_id: applicationId,
      html,
      label: label || `Revision ${nextRevision}`,
      revision_number: nextRevision,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getExecutiveReportRevisions(applicationId: string) {
  const { data, error } = await supabase
    .from('executive_report_revisions' as any)
    .select('*')
    .eq('application_id', applicationId)
    .order('revision_number', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteExecutiveReportRevision(id: string) {
  const { error } = await supabase
    .from('executive_report_revisions' as any)
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
