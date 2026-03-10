import { useState, useEffect, useCallback } from "react";
import {
  getProposedAssets,
  getGeneratedAssets,
  streamDynamicAssetGeneration,
  updateGeneratedAsset,
  saveDynamicAssetRevision,
  buildSiblingStructures,
  type GeneratedAsset,
} from "@/lib/api/dynamicAssets";
import { getActiveResumeText } from "@/lib/api/profile";
import { cleanHtml } from "@/lib/cleanHtml";
import type { Json } from "@/integrations/supabase/types";

interface UseDynamicAssetsInput {
  jobDescription: string;
  companyName: string;
  jobTitle: string;
  branding?: Json | null;
}

export function useDynamicAssets(appId: string | undefined, ctx: UseDynamicAssetsInput) {
  const [dynamicAssets, setDynamicAssets] = useState<GeneratedAsset[]>([]);
  const [hasProposals, setHasProposals] = useState(false);
  const [dynamicLoading, setDynamicLoading] = useState(true);
  const [showProposalDialog, setShowProposalDialog] = useState(false);

  // Load on mount
  useEffect(() => {
    if (!appId) return;
    (async () => {
      setDynamicLoading(true);
      try {
        const [assets, proposals] = await Promise.all([
          getGeneratedAssets(appId),
          getProposedAssets(appId),
        ]);
        setDynamicAssets(assets);
        setHasProposals(proposals.length > 0);
      } catch { }
      finally { setDynamicLoading(false); }
    })();
  }, [appId]);

  const generateDynamicAsset = useCallback(async (asset: GeneratedAsset) => {
    try {
      await updateGeneratedAsset(asset.id, { generation_status: 'generating' });
      setDynamicAssets((prev) =>
        prev.map((a) => a.id === asset.id ? { ...a, generation_status: 'generating' } : a)
      );

      let resumeText = "";
      try { resumeText = await getActiveResumeText(); } catch { }

      const { getLayoutStyleForAsset } = await import("@/lib/assetLayoutStyles");
      const currentAssets = dynamicAssets; // closure captures current state
      const layoutStyle = getLayoutStyleForAsset(asset.asset_name, currentAssets.map(a => a.asset_name));

      const siblingStructures = buildSiblingStructures(
        currentAssets.map(a => ({ asset_name: a.asset_name, html: a.html })),
        asset.asset_name,
      );

      let accumulated = "";
      await streamDynamicAssetGeneration({
        assetName: asset.asset_name,
        briefDescription: asset.brief_description,
        jobDescription: ctx.jobDescription,
        resumeText,
        companyName: ctx.companyName,
        jobTitle: ctx.jobTitle,
        branding: ctx.branding as Json | undefined,
        layoutStyle,
        siblingStructures,
        onDelta: (text) => { accumulated += text; },
        onDone: () => {},
      });

      const cleaned = cleanHtml(accumulated);
      const updated = await updateGeneratedAsset(asset.id, {
        html: cleaned,
        generation_status: 'complete',
      });

      try {
        await saveDynamicAssetRevision(asset.id, asset.application_id, cleaned, "Initial generation");
      } catch { }

      setDynamicAssets((prev) =>
        prev.map((a) => a.id === asset.id ? updated : a)
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      await updateGeneratedAsset(asset.id, {
        generation_status: 'error',
        generation_error: errMsg,
      });
      setDynamicAssets((prev) =>
        prev.map((a) => a.id === asset.id ? { ...a, generation_status: 'error', generation_error: errMsg } : a)
      );
    }
  }, [ctx.jobDescription, ctx.companyName, ctx.jobTitle, ctx.branding, dynamicAssets]);

  const handleAssetsConfirmed = useCallback(async (assets: GeneratedAsset[]) => {
    setDynamicAssets(assets);
    setShowProposalDialog(false);
    for (const asset of assets) {
      generateDynamicAsset(asset);
    }
  }, [generateDynamicAsset]);

  const handleAssetUpdated = useCallback((updated: GeneratedAsset) => {
    setDynamicAssets((prev) =>
      prev.map((a) => a.id === updated.id ? updated : a)
    );
  }, []);

  return {
    dynamicAssets,
    hasProposals,
    dynamicLoading,
    showProposalDialog,
    setShowProposalDialog,
    handleAssetsConfirmed,
    generateDynamicAsset,
    handleAssetUpdated,
  };
}
