import { streamFromEdgeFunction } from './streamUtils';
import { supabase } from '@/integrations/supabase/client';
import { getProfile } from './profile';

/**
 * Stream-generate a tailored resume HTML.
 * Auto-fetches user's resume text from profile if not provided.
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
  branding?: any;
  competitors?: string[];
  customers?: string[];
  products?: string[];
  profileContext?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  // Auto-fetch resume text from profile if not provided
  let finalResumeText = resumeText;
  if (!finalResumeText) {
    try {
      const profile = await getProfile();
      finalResumeText = profile?.resume_text || "";
    } catch { /* non-critical */ }
  }

  await streamFromEdgeFunction({
    functionName: 'generate-resume',
    body: { jobDescription, resumeText: finalResumeText, systemPrompt, companyName, jobTitle, branding, competitors, customers, products, profileContext },
    onDelta,
    onDone,
  });
}

/**
 * Fetch all active resume prompt styles for dropdown.
 */
export async function getActiveResumeStyles() {
  const { data, error } = await (supabase as any)
    .from('resume_prompt_styles')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Array<{
    id: string;
    label: string;
    slug: string;
    system_prompt: string;
    description: string | null;
    sort_order: number;
  }>;
}

/**
 * Get a single resume prompt style by ID.
 */
export async function getResumeStyle(id: string) {
  const { data, error } = await (supabase as any)
    .from('resume_prompt_styles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as {
    id: string;
    label: string;
    slug: string;
    system_prompt: string;
    description: string | null;
    sort_order: number;
  };
}
