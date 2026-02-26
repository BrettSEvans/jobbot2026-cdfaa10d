import { supabase } from '@/integrations/supabase/client';

export async function saveDashboardRevision(applicationId: string, dashboardHtml: string, label?: string) {
  // Get next revision number
  const { data: latest } = await supabase
    .from('dashboard_revisions')
    .select('revision_number')
    .eq('application_id', applicationId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  const nextRevision = (latest?.revision_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('dashboard_revisions')
    .insert({
      application_id: applicationId,
      dashboard_html: dashboardHtml,
      label: label || `Revision ${nextRevision}`,
      revision_number: nextRevision,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getDashboardRevisions(applicationId: string) {
  const { data, error } = await supabase
    .from('dashboard_revisions')
    .select('*')
    .eq('application_id', applicationId)
    .order('revision_number', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDashboardRevision(id: string) {
  const { error } = await supabase
    .from('dashboard_revisions')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
