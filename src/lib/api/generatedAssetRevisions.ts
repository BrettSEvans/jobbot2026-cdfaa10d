import { supabase } from '@/integrations/supabase/client';

export async function saveGeneratedAssetRevision(
  applicationId: string,
  assetId: string,
  html: string,
  label?: string
) {
  const { data: latest } = await supabase
    .from('generated_asset_revisions')
    .select('revision_number')
    .eq('asset_id', assetId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  const nextRevision = (latest?.revision_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('generated_asset_revisions')
    .insert({
      application_id: applicationId,
      asset_id: assetId,
      html,
      label: label || `Revision ${nextRevision}`,
      revision_number: nextRevision,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getGeneratedAssetRevisions(assetId: string) {
  const { data, error } = await supabase
    .from('generated_asset_revisions')
    .select('id, asset_id, application_id, revision_number, label, created_at, html')
    .eq('asset_id', assetId)
    .order('revision_number', { ascending: false });

  if (error) {
    console.error('getGeneratedAssetRevisions error:', error.message, 'assetId:', assetId);
    throw new Error(error.message);
  }
  return data || [];
}
