import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface PairwiseScore {
  asset1: string;
  asset2: string;
  similarity: number;
}

export interface StructuralPattern {
  assetName: string;
  dominantPattern: string;
}

export interface DesignVariabilityResult {
  overallScore: number;
  brandingScore: number;
  pairwiseScores: PairwiseScore[];
  structuralPatterns: StructuralPattern[];
  recommendations: string[];
  scoredAt: string;
}

export async function scoreDesignVariability(
  applicationId: string,
  assets: { assetName: string; html: string }[],
  branding: Record<string, unknown> | null,
): Promise<DesignVariabilityResult> {
  const { data, error } = await supabase.functions.invoke("score-design-variability", {
    body: { applicationId, assets, branding },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data as DesignVariabilityResult;
}

export function getCachedVariability(
  app: { design_variability?: Json | null } | null,
): DesignVariabilityResult | null {
  if (!app?.design_variability) return null;
  const dv = app.design_variability as unknown as DesignVariabilityResult;
  if (dv.overallScore == null) return null;
  return dv;
}
