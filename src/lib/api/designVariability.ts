import { supabase } from '@/integrations/supabase/client';

export interface VariabilityResult {
  overallScore: number;
  brandingScore: number;
  storytellingScore: number;
  styleScore: number;
  interactivityScore: number;
  pairwiseScores: Array<{ asset1: string; asset2: string; similarity: number }>;
  structuralPatterns: Array<{ assetName: string; dominantPattern: string }>;
  narrativePatterns: Array<{ assetName: string; narrativeAngle: string }>;
  contentFlowPatterns: Array<{ assetName: string; flowPattern: string; layoutType: string }>;
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
    storytellingScore: data.storytellingScore ?? 0,
    styleScore: data.styleScore ?? 0,
    interactivityScore: data.interactivityScore ?? 0,
    pairwiseScores: data.pairwiseScores ?? [],
    structuralPatterns: data.structuralPatterns ?? [],
    narrativePatterns: data.narrativePatterns ?? [],
    contentFlowPatterns: data.contentFlowPatterns ?? [],
    recommendations: data.recommendations ?? [],
  };

  // Persist to job_applications.design_variability
  await supabase.from('job_applications').update({
    design_variability: result as any,
  }).eq('id', appId);

  return result;
}

export function getCachedVariability(app: any): VariabilityResult | null {
  const cached = app?.design_variability;
  if (!cached) return null;
  return {
    overallScore: cached.overallScore ?? 0,
    brandingScore: cached.brandingScore ?? 0,
    storytellingScore: cached.storytellingScore ?? 0,
    styleScore: cached.styleScore ?? 0,
    interactivityScore: cached.interactivityScore ?? 0,
    pairwiseScores: cached.pairwiseScores ?? [],
    structuralPatterns: cached.structuralPatterns ?? [],
    narrativePatterns: cached.narrativePatterns ?? [],
    contentFlowPatterns: cached.contentFlowPatterns ?? [],
    recommendations: cached.recommendations ?? [],
  };
}
