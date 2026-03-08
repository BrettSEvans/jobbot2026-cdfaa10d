import { streamFromEdgeFunction } from './streamUtils';
import { supabase } from '@/integrations/supabase/client';
import { getActiveResumeText, getProfileContextForPrompt } from './profile';
import type { Json } from '@/integrations/supabase/types';

/**
 * Stream-generate a tailored resume HTML.
 * Auto-fetches user's resume text and profile context if not provided.
 */
export async function streamResumeGeneration({
  jobDescription,
  resumeText,
  systemPrompt,
  companyName,
  jobTitle,
  branding,
  competitors,
  customers,
  products,
  profileContext,
  onDelta,
  onDone,
}: {
  jobDescription: string;
  resumeText?: string;
  systemPrompt?: string;
  companyName?: string;
  jobTitle?: string;
  branding?: Json;
  competitors?: string[];
  customers?: string[];
  products?: string[];
  profileContext?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  // Auto-fetch resume text and profile context in parallel
  const [finalResumeText, finalProfileContext, generationGuide] = await Promise.all([
    resumeText ? Promise.resolve(resumeText) : getActiveResumeText().catch(() => ""),
    profileContext ? Promise.resolve(profileContext) : getProfileContextForPrompt().catch(() => ""),
    import("@/lib/api/systemDocuments")
      .then(({ getGenerationGuideForPrompt }) => getGenerationGuideForPrompt())
      .catch(() => ""),
  ]);

  await streamFromEdgeFunction({
    functionName: 'generate-resume',
    body: { jobDescription, resumeText: finalResumeText, systemPrompt, companyName, jobTitle, branding, competitors, customers, products, profileContext: finalProfileContext, generationGuide },
    onDelta,
    onDone,
  });
}

/**
 * Fetch all active resume prompt styles for dropdown.
 */
export async function getActiveResumeStyles() {
  const { data, error } = await supabase
    .from('resume_prompt_styles')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Get a single resume prompt style by ID.
 */
export async function getResumeStyle(id: string) {
  const { data, error } = await supabase
    .from('resume_prompt_styles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}
