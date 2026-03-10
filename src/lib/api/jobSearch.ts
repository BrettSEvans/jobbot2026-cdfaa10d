import { supabase } from '@/integrations/supabase/client';

export type JobSearchResult = {
  url: string;
  title: string;
  description: string;
  markdown: string;
};

export type SearchJobsResponse = {
  success: boolean;
  results?: JobSearchResult[];
  error?: string;
};

export const SITE_FILTERS: { label: string; value: string }[] = [
  { label: 'All Sites', value: '' },
  { label: 'Google Careers', value: 'careers.google.com' },
  { label: 'LinkedIn', value: 'linkedin.com/jobs' },
  { label: 'Indeed', value: 'indeed.com' },
  { label: 'Glassdoor', value: 'glassdoor.com' },
  { label: 'Lever', value: 'jobs.lever.co' },
  { label: 'Greenhouse', value: 'boards.greenhouse.io' },
  { label: 'Workday', value: 'myworkdayjobs.com' },
];

export async function searchJobs(
  query: string,
  site?: string,
  limit?: number,
): Promise<SearchJobsResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { success: false, error: 'Search query is required' };
  }

  const { data, error } = await supabase.functions.invoke('search-jobs', {
    body: { query: trimmed, site: site || undefined, limit },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as SearchJobsResponse;
}

/** Extract a likely company name from a URL hostname */
export function extractCompanyFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove www, careers, jobs prefixes and .com/.org etc
    const parts = hostname
      .replace(/^(www|careers|jobs)\./, '')
      .split('.');
    return parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1) || '';
  } catch {
    return '';
  }
}
