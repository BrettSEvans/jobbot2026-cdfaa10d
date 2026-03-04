import { supabase } from '@/integrations/supabase/client';
import { streamFromEdgeFunction } from './streamUtils';

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
  onDelta,
  onDone,
}: {
  jobDescription: string;
  customInstructions?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  await streamFromEdgeFunction({
    functionName: 'tailor-cover-letter',
    body: { jobDescription, customInstructions },
    onDelta,
    onDone,
  });
}
