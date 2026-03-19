import { supabase } from '@/integrations/supabase/client';
import type { ExtractedKeyword } from '@/lib/keywordMatcher';

export async function generateOptimizedResume({
  jobDescription,
  resumeText,
  missingKeywords,
  userPrompt,
  companyName,
  jobTitle,
}: {
  jobDescription: string;
  resumeText: string;
  missingKeywords: ExtractedKeyword[];
  userPrompt?: string;
  companyName?: string;
  jobTitle?: string;
}): Promise<{ resume_html: string; keywords_injected: string[] }> {
  const { data, error } = await supabase.functions.invoke('generate-resume', {
    body: { jobDescription, resumeText, missingKeywords, userPrompt, companyName, jobTitle },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Resume generation failed');
  return { resume_html: data.resume_html, keywords_injected: data.keywords_injected };
}
