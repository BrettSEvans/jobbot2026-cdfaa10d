import { supabase } from "@/integrations/supabase/client";
import type { ExtractedKeyword } from "@/lib/keywordMatcher";

export interface KeywordExtractionResult {
  keywords: ExtractedKeyword[];
  job_function: string;
}

export async function extractJdKeywords(
  jobDescription: string
): Promise<KeywordExtractionResult> {
  const { data, error } = await supabase.functions.invoke("extract-jd-keywords", {
    body: { jobDescription },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Keyword extraction failed");
  return { keywords: data.keywords, job_function: data.job_function };
}
