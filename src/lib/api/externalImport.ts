/**
 * External import API — used by Chrome Extension infrastructure.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ImportJobParams {
  source: string;
  url: string;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
}

export interface ImportJobResult {
  success: boolean;
  applicationId: string;
  source: string;
}

/**
 * Parse import params from URL query string.
 */
export function parseImportParams(searchParams: URLSearchParams): ImportJobParams | null {
  const url = searchParams.get('url');
  if (!url) return null;

  return {
    source: searchParams.get('source') || 'unknown',
    url,
    jobTitle: searchParams.get('title') || undefined,
    companyName: searchParams.get('company') || undefined,
    jobDescription: searchParams.get('description') || undefined,
  };
}

/**
 * Import a job from an external source (Chrome extension, etc).
 */
export async function importJobExternal(params: ImportJobParams): Promise<ImportJobResult> {
  const { data, error } = await supabase.functions.invoke('import-job-external', {
    body: params,
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data as ImportJobResult;
}
