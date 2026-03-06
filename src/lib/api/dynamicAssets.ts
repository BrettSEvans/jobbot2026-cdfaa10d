/**
 * API functions for dynamic asset proposal, generation, and management.
 */
import { supabase } from '@/integrations/supabase/client';
import { streamFromEdgeFunction } from './streamUtils';
import { getStyleContextForPrompt } from './stylePreferences';

export interface ProposedAsset {
  asset_name: string;
  brief_description: string;
}

export interface GeneratedAsset {
  id: string;
  application_id: string;
  asset_name: string;
  brief_description: string;
  html: string;
  generation_status: string;
  generation_error: string | null;
  downloaded_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Mark an asset as downloaded (locks regen/refine/swap) ---
export async function markAssetDownloaded(assetId: string) {
  const { data, error } = await (supabase as any)
    .from('generated_assets')
    .update({ downloaded_at: new Date().toISOString() })
    .eq('id', assetId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as GeneratedAsset;
}

// --- Propose 6 asset types via AI ---
export async function proposeAssets({
  jobDescription,
  resumeText,
  companyName,
  jobTitle,
  industry,
}: {
  jobDescription: string;
  resumeText?: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
}): Promise<ProposedAsset[]> {
  const { data, error } = await supabase.functions.invoke('propose-assets', {
    body: { jobDescription, resumeText, companyName, jobTitle, industry },
  });
  // Check data.error first since supabase wraps non-2xx with generic error message
  if (data?.error) throw new Error(data.error);
  if (error) throw new Error(error.message);
  return data?.suggested_assets || [];
}

// --- Save proposed assets to DB ---
export async function saveProposedAssets(applicationId: string, assets: ProposedAsset[]) {
  // Clear existing proposals first
  await (supabase as any).from('proposed_assets').delete().eq('application_id', applicationId);

  const rows = assets.map((a) => ({
    application_id: applicationId,
    asset_name: a.asset_name,
    brief_description: a.brief_description,
    selected: false,
  }));

  const { data, error } = await (supabase as any)
    .from('proposed_assets')
    .insert(rows)
    .select();
  if (error) throw new Error(error.message);
  return data;
}

// --- Get proposed assets for an application ---
export async function getProposedAssets(applicationId: string) {
  const { data, error } = await (supabase as any)
    .from('proposed_assets')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// --- Mark selected proposals and create generated_assets rows ---
export async function confirmAssetSelection(applicationId: string, selectedNames: string[]) {
  // Get all proposals
  const proposals = await getProposedAssets(applicationId);
  
  // Update selected status
  for (const p of proposals) {
    const isSelected = selectedNames.includes(p.asset_name);
    await (supabase as any)
      .from('proposed_assets')
      .update({ selected: isSelected })
      .eq('id', p.id);
  }

  // Create generated_assets rows for selected ones
  const selectedProposals = proposals.filter((p: any) => selectedNames.includes(p.asset_name));
  const rows = selectedProposals.map((p: any) => ({
    application_id: applicationId,
    asset_name: p.asset_name,
    brief_description: p.brief_description,
    generation_status: 'pending',
  }));

  // Clear any existing generated assets first
  await (supabase as any).from('generated_assets').delete().eq('application_id', applicationId);

  const { data, error } = await (supabase as any)
    .from('generated_assets')
    .insert(rows)
    .select();
  if (error) throw new Error(error.message);
  return data as GeneratedAsset[];
}

// --- Get generated assets for an application ---
export async function getGeneratedAssets(applicationId: string): Promise<GeneratedAsset[]> {
  const { data, error } = await (supabase as any)
    .from('generated_assets')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as GeneratedAsset[];
}

// --- Update a generated asset ---
export async function updateGeneratedAsset(assetId: string, fields: Partial<GeneratedAsset>) {
  const { data, error } = await (supabase as any)
    .from('generated_assets')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', assetId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as GeneratedAsset;
}

// --- Stream generate a single dynamic asset ---
export async function streamDynamicAssetGeneration({
  assetName,
  briefDescription,
  jobDescription,
  resumeText,
  companyName,
  jobTitle,
  branding,
  onDelta,
  onDone,
}: {
  assetName: string;
  briefDescription?: string;
  jobDescription: string;
  resumeText?: string;
  companyName?: string;
  jobTitle?: string;
  branding?: any;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  let styleContext = "";
  try { styleContext = await getStyleContextForPrompt(); } catch { /* non-critical */ }

  await streamFromEdgeFunction({
    functionName: 'generate-dynamic-asset',
    body: { assetName, briefDescription, jobDescription, resumeText, companyName, jobTitle, branding, styleContext },
    onDelta,
    onDone,
  });
}

// --- Stream refine a dynamic asset ---
export async function streamRefineDynamicAsset({
  assetName,
  currentHtml,
  userMessage,
  jobDescription,
  companyName,
  jobTitle,
  branding,
  onDelta,
  onDone,
}: {
  assetName: string;
  currentHtml: string;
  userMessage: string;
  jobDescription?: string;
  companyName?: string;
  jobTitle?: string;
  branding?: any;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  let styleContext = "";
  try { styleContext = await getStyleContextForPrompt(); } catch { /* non-critical */ }

  await streamFromEdgeFunction({
    functionName: 'refine-dynamic-asset',
    body: { assetName, currentHtml, userMessage, jobDescription, companyName, jobTitle, branding, styleContext },
    onDelta,
    onDone,
  });
}

// --- Revision CRUD for dynamic assets ---
export async function saveDynamicAssetRevision(assetId: string, applicationId: string, html: string, label?: string) {
  const { data: latest } = await (supabase as any)
    .from('generated_asset_revisions')
    .select('revision_number')
    .eq('asset_id', assetId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  const nextRevision = ((latest as any)?.revision_number ?? 0) + 1;

  const { data, error } = await (supabase as any)
    .from('generated_asset_revisions')
    .insert({
      asset_id: assetId,
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

export async function getDynamicAssetRevisions(assetId: string) {
  const { data, error } = await (supabase as any)
    .from('generated_asset_revisions')
    .select('*')
    .eq('asset_id', assetId)
    .order('revision_number', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// --- Replace a single generated asset with a new asset type ---
export async function replaceGeneratedAsset(
  assetId: string,
  applicationId: string,
  newAssetName: string,
  newBriefDescription: string,
): Promise<GeneratedAsset> {
  // Delete old revisions for this asset
  await (supabase as any)
    .from('generated_asset_revisions')
    .delete()
    .eq('asset_id', assetId);

  // Update the asset row with new type
  const { data, error } = await (supabase as any)
    .from('generated_assets')
    .update({
      asset_name: newAssetName,
      brief_description: newBriefDescription,
      html: '',
      generation_status: 'pending',
      generation_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as GeneratedAsset;
}
