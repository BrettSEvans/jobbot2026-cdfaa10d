import { streamFromEdgeFunction } from './streamUtils';
import { getStyleContextForPrompt } from './stylePreferences';

/**
 * Generic streaming refinement for any HTML asset type.
 * Calls the corresponding refine-{assetType} edge function.
 * Automatically injects user style preferences.
 */

const ASSET_FUNCTION_MAP: Record<string, string> = {
  'executive-report': 'refine-executive-report',
  'raid-log': 'refine-raid-log',
  'architecture-diagram': 'refine-architecture-diagram',
  'roadmap': 'refine-roadmap',
  'resume': 'refine-resume',
};

export type RefinableAssetType = 'executive-report' | 'raid-log' | 'architecture-diagram' | 'roadmap' | 'resume';

export async function streamRefineAsset({
  assetType,
  currentHtml,
  userMessage,
  jobDescription,
  companyName,
  jobTitle,
  branding,
  onDelta,
  onDone,
}: {
  assetType: RefinableAssetType;
  currentHtml: string;
  userMessage: string;
  jobDescription?: string;
  companyName?: string;
  jobTitle?: string;
  branding?: any;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const fnName = ASSET_FUNCTION_MAP[assetType];
  if (!fnName) throw new Error(`Unknown asset type: ${assetType}`);

  // Fetch user style preferences for injection
  let styleContext = "";
  try {
    styleContext = await getStyleContextForPrompt();
  } catch { /* non-critical */ }

  await streamFromEdgeFunction({
    functionName: fnName,
    body: { currentHtml, userMessage, jobDescription, companyName, jobTitle, branding, styleContext },
    onDelta,
    onDone,
  });
}
