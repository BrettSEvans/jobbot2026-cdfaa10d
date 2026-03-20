import { supabase } from '@/integrations/supabase/client';

export async function saveResumeRevision(applicationId: string, html: string, label?: string) {
  const { data: latest } = await supabase
    .from('resume_revisions')
    .select('revision_number')
    .eq('application_id', applicationId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  const nextRevision = (latest?.revision_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('resume_revisions')
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

export async function getResumeRevisions(applicationId: string) {
  const { data, error } = await supabase
    .from('resume_revisions')
    .select('*')
    .eq('application_id', applicationId)
    .order('revision_number', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
