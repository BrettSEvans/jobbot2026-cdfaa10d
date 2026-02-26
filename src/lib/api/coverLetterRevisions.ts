import { supabase } from '@/integrations/supabase/client';

export async function saveCoverLetterRevision(applicationId: string, coverLetter: string, label?: string) {
  const { data: latest } = await supabase
    .from('cover_letter_revisions')
    .select('revision_number')
    .eq('application_id', applicationId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  const nextRevision = (latest?.revision_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('cover_letter_revisions')
    .insert({
      application_id: applicationId,
      cover_letter: coverLetter,
      label: label || `Revision ${nextRevision}`,
      revision_number: nextRevision,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getCoverLetterRevisions(applicationId: string) {
  const { data, error } = await supabase
    .from('cover_letter_revisions')
    .select('*')
    .eq('application_id', applicationId)
    .order('revision_number', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
