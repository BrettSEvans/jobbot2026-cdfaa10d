import { supabase } from '@/integrations/supabase/client';

export interface VariabilityResult {
  overallScore: number;
  brandingScore: number;
  pairwiseScores: Array<{ asset1: string; asset2: string; similarity: number }>;
  structuralPatterns: Array<{ assetName: string; dominantPattern: string }>;
  recommendations: string[];
}

export async function scoreDesignVariability(
  appId: string,
  assets: Array<{ assetName: string; html: string }>,
  branding?: any,
): Promise<VariabilityResult> {
  const { data, error } = await supabase.functions.invoke('score-design-variability', {
    body: { assets, branding },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  const result: VariabilityResult = {
    overallScore: data.overallScore ?? 0,
    brandingScore: data.brandingScore ?? 0,
    pairwiseScores: data.pairwiseScores ?? [],
    structuralPatterns: data.structuralPatterns ?? [],
    recommendations: data.recommendations ?? [],
  };

  // Persist to job_applications.design_variability
  await supabase.from('job_applications').update({
    design_variability: result as any,
  }).eq('id', appId);

  return result;
}

export function getCachedVariability(app: any): VariabilityResult | null {
  return app?.design_variability ?? null;
}
