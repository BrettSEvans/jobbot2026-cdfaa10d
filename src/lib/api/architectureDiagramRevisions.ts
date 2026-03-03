import { supabase } from '@/integrations/supabase/client';

export async function saveArchitectureDiagramRevision(applicationId: string, html: string, label?: string) {
  const { data: latest } = await supabase
    .from('architecture_diagram_revisions' as any)
    .select('revision_number')
    .eq('application_id', applicationId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  const nextRevision = ((latest as any)?.revision_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('architecture_diagram_revisions' as any)
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

export async function getArchitectureDiagramRevisions(applicationId: string) {
  const { data, error } = await supabase
    .from('architecture_diagram_revisions' as any)
    .select('*')
    .eq('application_id', applicationId)
    .order('revision_number', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteArchitectureDiagramRevision(id: string) {
  const { error } = await supabase
    .from('architecture_diagram_revisions' as any)
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
