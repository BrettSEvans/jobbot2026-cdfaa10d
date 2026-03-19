import { supabase } from '@/integrations/supabase/client';

export interface BulletChange {
  type: 'keyword_injection' | 'quantification' | 'xyz_rewrite' | 'reordered' | 'removed' | 'added' | 'rephrased';
  baseline_text: string;
  tailored_text: string;
  explanation: string;
  fabrication_risk: boolean;
  fabrication_reason: string | null;
}

export interface SectionDiff {
  name: string;
  status: 'modified' | 'added' | 'removed' | 'unchanged' | 'reordered';
  baseline_content: string;
  tailored_content: string;
  changes: BulletChange[];
}

export interface DiffStats {
  total_bullets_baseline: number;
  total_bullets_tailored: number;
  bullets_modified: number;
  bullets_added: number;
  bullets_removed: number;
  keywords_injected: number;
  sections_reordered: number;
  fabrication_flags: number;
}

export interface ResumeDiff {
  sections: SectionDiff[];
  change_summary: string;
  what_kept: string;
  stats: DiffStats;
}

export interface DiffResponse {
  diff: ResumeDiff;
  trust_score: number;
}

export async function computeResumeDiff({
  baselineText,
  tailoredHtml,
  jobDescriptionMarkdown,
}: {
  baselineText: string;
  tailoredHtml: string;
  jobDescriptionMarkdown?: string;
}): Promise<DiffResponse> {
  const { data, error } = await supabase.functions.invoke('resume-diff', {
    body: { baselineText, tailoredHtml, jobDescriptionMarkdown },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Diff computation failed');
  return { diff: data.diff, trust_score: data.trust_score };
}
