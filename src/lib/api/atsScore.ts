/**
 * ATS Match Score API — scoring, caching, and tier gating.
 */
import { supabase } from '@/integrations/supabase/client';
import { saveJobApplication } from './jobApplication';

export interface AtsScoreResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  keywordGroups: Record<string, string[]>;
}

/**
 * Simple hash for change detection (not cryptographic).
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

/**
 * Check if a cached score is still valid.
 */
export function isCacheValid(
  atsScore: AtsScoreResult | null,
  atsScoredAt: string | null,
  currentResumeHtml: string,
  currentJd: string,
): boolean {
  if (!atsScore || !atsScoredAt) return false;

  // Check age (7 days max)
  const scoredDate = new Date(atsScoredAt);
  const daysSince = (Date.now() - scoredDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 7) return false;

  // Check if inputs changed (stored hash in score)
  const currentHash = simpleHash(currentResumeHtml + currentJd);
  if ((atsScore as any)._inputHash && (atsScore as any)._inputHash !== currentHash) return false;

  return true;
}

/**
 * Score a resume against a job description via the edge function.
 */
export async function scoreAtsMatch(
  applicationId: string,
  jobDescription: string,
  resumeHtml: string,
): Promise<AtsScoreResult> {
  const { data, error } = await supabase.functions.invoke('score-ats-match', {
    body: { jobDescription, resumeHtml },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  const result: AtsScoreResult = {
    score: data.score,
    matchedKeywords: data.matchedKeywords,
    missingKeywords: data.missingKeywords,
    suggestions: data.suggestions,
    keywordGroups: data.keywordGroups,
  };

  // Store hash for cache invalidation
  const inputHash = simpleHash(resumeHtml + jobDescription);
  const scoreWithHash = { ...result, _inputHash: inputHash };

  // Persist to DB
  await saveJobApplication({
    id: applicationId,
    job_url: '', // Will be ignored since id is provided
    ats_score: scoreWithHash as any,
    ats_scored_at: new Date().toISOString(),
  } as any);

  return result;
}
