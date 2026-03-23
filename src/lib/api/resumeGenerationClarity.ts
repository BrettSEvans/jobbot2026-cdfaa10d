import { supabase } from '@/integrations/supabase/client';

export async function generateClarityResume({
  jobDescription,
  resumeText,
  companyName,
  jobTitle,
}: {
  jobDescription: string;
  resumeText: string;
  companyName?: string;
  jobTitle?: string;
}): Promise<{ resume_html: string }> {
  const { data, error } = await supabase.functions.invoke('generate-resume-clarity', {
    body: { jobDescription, resumeText, companyName, jobTitle },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Clarity resume generation failed');
  return { resume_html: data.resume_html };
}
