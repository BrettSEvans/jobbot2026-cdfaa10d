import { supabase } from '@/integrations/supabase/client';
import { streamFromEdgeFunction } from './streamUtils';
import { getStyleContextForPrompt } from './stylePreferences';

export async function scrapeJob(url: string): Promise<{ markdown: string; title: string }> {
  const { data, error } = await supabase.functions.invoke('scrape-job', {
    body: { url },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Failed to scrape job');
  return { markdown: data.markdown, title: data.title };
}

export async function streamTailoredLetter({
  jobDescription,
  customInstructions,
  profileContext,
  onDelta,
  onDone,
}: {
  jobDescription: string;
  customInstructions?: string;
  profileContext?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  let styleContext = "";
  try { styleContext = await getStyleContextForPrompt(); } catch { /* non-critical */ }

  let generationGuide = "";
  try {
    const { getGenerationGuideForPrompt } = await import("@/lib/api/systemDocuments");
    generationGuide = await getGenerationGuideForPrompt();
  } catch { /* non-critical — generation continues without guide */ }

  await streamFromEdgeFunction({
    functionName: 'tailor-cover-letter',
    body: { jobDescription, customInstructions, profileContext, styleContext, generationGuide },
    onDelta,
    onDone,
  });
}
