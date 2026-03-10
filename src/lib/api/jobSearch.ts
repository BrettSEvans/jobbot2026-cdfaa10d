import { supabase } from '@/integrations/supabase/client';

export type JobSearchResult = {
  url: string;
  title: string;
  description: string;
  markdown: string;
};

export type SearchFilters = {
  location?: string;
  workMode?: '' | 'remote' | 'on-site' | 'hybrid';
  jobType?: '' | 'full-time' | 'part-time' | 'contract' | 'internship';
};

export type SearchJobsResponse = {
  success: boolean;
  results?: JobSearchResult[];
  error?: string;
};

export const SITE_FILTERS: { label: string; value: string }[] = [
  { label: 'All Sites', value: '' },
  { label: 'Google Jobs', value: 'google.com/search' },
  { label: 'LinkedIn', value: 'linkedin.com/jobs/view' },
  { label: 'Indeed', value: 'indeed.com' },
  { label: 'Glassdoor', value: 'glassdoor.com' },
  { label: 'Lever', value: 'jobs.lever.co' },
  { label: 'Greenhouse', value: 'boards.greenhouse.io' },
  { label: 'Workday', value: 'myworkdayjobs.com' },
];

export const WORK_MODES = [
  { label: 'Any', value: '' },
  { label: 'Remote', value: 'remote' },
  { label: 'On-site', value: 'on-site' },
  { label: 'Hybrid', value: 'hybrid' },
] as const;

export const JOB_TYPES = [
  { label: 'Any', value: '' },
  { label: 'Full-time', value: 'full-time' },
  { label: 'Part-time', value: 'part-time' },
  { label: 'Contract', value: 'contract' },
  { label: 'Internship', value: 'internship' },
] as const;

export async function searchJobs(
  query: string,
  site?: string,
  limit?: number,
  filters?: SearchFilters,
): Promise<SearchJobsResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { success: false, error: 'Search query is required' };
  }

  const { data, error } = await supabase.functions.invoke('search-jobs', {
    body: { query: trimmed, site: site || undefined, limit, filters },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as SearchJobsResponse;
}

/** Build a display-friendly query preview showing active filters */
export function buildFilterSummary(filters: SearchFilters): string {
  const parts: string[] = [];
  if (filters.location) parts.push(filters.location);
  if (filters.workMode) parts.push(filters.workMode);
  if (filters.jobType) parts.push(filters.jobType);
  return parts.join(' · ');
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
