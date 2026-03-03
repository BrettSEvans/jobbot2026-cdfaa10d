/**
 * Generic streaming refinement for any HTML asset type.
 * Calls the corresponding refine-{assetType} edge function.
 */

const ASSET_FUNCTION_MAP: Record<string, string> = {
  'executive-report': 'refine-executive-report',
  'raid-log': 'refine-raid-log',
  'architecture-diagram': 'refine-architecture-diagram',
  'roadmap': 'refine-roadmap',
};

export type RefinableAssetType = 'executive-report' | 'raid-log' | 'architecture-diagram' | 'roadmap';

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

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ currentHtml, userMessage, jobDescription, companyName, jobTitle, branding }),
    }
  );

  if (!resp.ok || !resp.body) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `Refinement failed (${resp.status})`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const json = line.slice(6).trim();
      if (json === '[DONE]') { streamDone = true; break; }

      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }

  onDone();
}
