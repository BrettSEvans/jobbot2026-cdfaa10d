/**
 * ATS Match Score API — scoring, caching, baseline delta, and tier gating.
 */
import { supabase } from '@/integrations/supabase/client';
import { saveJobApplication } from './jobApplication';
import { getActiveResumeText } from './profile';
import type { Json } from '@/integrations/supabase/types';

export interface WeakBulletExample {
  text: string;
  suggestion: string;
}

export interface OverusedWord {
  word: string;
  count: number;
  synonyms: string[];
}

export interface AtsScoreResult {
  score: number;
  parseRate: number;
  parsedSections: string[];
  missingSections: string[];
  impactAnalysis: {
    strongBullets: number;
    weakBullets: number;
    weakExamples: WeakBulletExample[];
  };
  repetitionAudit: {
    overusedWords: OverusedWord[];
  };
  professionalismFlags: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  keywordGroups: Record<string, string[]>;
  _inputHash?: string;
  _baselineScore?: number;
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

  const scoredDate = new Date(atsScoredAt);
  const daysSince = (Date.now() - scoredDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 7) return false;

  const currentHash = simpleHash(currentResumeHtml + currentJd);
  if (atsScore._inputHash && atsScore._inputHash !== currentHash) return false;

  return true;
}

/**
 * Normalize the edge function response into a full AtsScoreResult.
 */
function normalizeResult(data: Record<string, unknown>): Omit<AtsScoreResult, '_inputHash' | '_baselineScore'> {
  const impact = (data.impactAnalysis as Record<string, unknown>) || {};
  const repetition = (data.repetitionAudit as Record<string, unknown>) || {};
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(data.score) || 0))),
    parseRate: Math.max(0, Math.min(100, Math.round(Number(data.parseRate) || 0))),
    parsedSections: (data.parsedSections as string[]) || [],
    missingSections: (data.missingSections as string[]) || [],
    impactAnalysis: {
      strongBullets: Number(impact.strongBullets) || 0,
      weakBullets: Number(impact.weakBullets) || 0,
      weakExamples: (impact.weakExamples as WeakBulletExample[]) || [],
    },
    repetitionAudit: {
      overusedWords: (repetition.overusedWords as OverusedWord[]) || [],
    },
    professionalismFlags: (data.professionalismFlags as string[]) || [],
    matchedKeywords: (data.matchedKeywords as string[]) || [],
    missingKeywords: (data.missingKeywords as string[]) || [],
    suggestions: (data.suggestions as string[]) || [],
    keywordGroups: (data.keywordGroups as Record<string, string[]>) || {},
  };
}

/**
 * Score a resume against a job description via the edge function.
 * Optionally fetches baseline score from user's raw profile resume.
 */
export async function scoreAtsMatch(
  applicationId: string,
  jobDescription: string,
  resumeHtml: string,
  existingBaselineScore?: number,
): Promise<AtsScoreResult> {
  const { data, error } = await supabase.functions.invoke('score-ats-match', {
    body: { jobDescription, resumeHtml },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  const result: AtsScoreResult = {
    ...normalizeResult(data),
    _baselineScore: existingBaselineScore,
  };

  // Store hash for cache invalidation
  const inputHash = simpleHash(resumeHtml + jobDescription);
  const scoreWithHash = { ...result, _inputHash: inputHash };

  // Persist to DB
  await saveJobApplication({
    id: applicationId,
    job_url: '',
    ats_score: scoreWithHash as unknown as Json,
    ats_scored_at: new Date().toISOString(),
  });

  return scoreWithHash;
}

/**
 * Score the user's baseline (raw profile) resume against a JD.
 * Returns just the overall score number, or null if unavailable.
 */
export async function scoreBaselineResume(
  jobDescription: string,
): Promise<number | null> {
  try {
    const resumeText = await getActiveResumeText();
    if (!resumeText || resumeText.length < 50) return null;

    const { data, error } = await supabase.functions.invoke('score-ats-match', {
      body: { jobDescription, resumeHtml: resumeText },
    });
    if (error || data?.error) return null;

    return Math.max(0, Math.min(100, Math.round(Number(data.score) || 0)));
  } catch {
    return null;
  }
}
