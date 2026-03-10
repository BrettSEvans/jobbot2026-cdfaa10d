import { useState, useEffect, useRef, useCallback } from "react";
import { scoreAtsMatch, scoreBaselineResume, isCacheValid, type AtsScoreResult } from "@/lib/api/atsScore";
import type { JobApplication } from "@/hooks/useApplicationDetail";

export function useAtsAutoScore(
  appId: string | undefined,
  resumeHtml: string,
  jobDescription: string,
  app: JobApplication | null,
  setResumeHtml: (v: string) => void,
  saveField: (fields: Partial<JobApplication>) => Promise<void>,
) {
  const [atsScore, setAtsScore] = useState<AtsScoreResult | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);

  const prevResumeHtmlRef = useRef<string>("");
  const atsAutoTriggered = useRef(false);

  // Load ATS score from app data
  useEffect(() => {
    if (app?.ats_score) {
      const score = app.ats_score as unknown as AtsScoreResult;
      if (score.score != null) setAtsScore(score);
    }
  }, [app]);

  const handleAtsRescan = useCallback(async () => {
    if (!appId || !resumeHtml || !jobDescription) return;
    setAtsLoading(true);
    try {
      let baselineScore = atsScore?._baselineScore;
      if (baselineScore == null) {
        baselineScore = (await scoreBaselineResume(jobDescription)) ?? undefined;
      }
      const result = await scoreAtsMatch(appId, jobDescription, resumeHtml, baselineScore);
      setAtsScore(result);
    } catch (err: unknown) {
      console.warn("ATS scoring failed:", err);
    } finally {
      setAtsLoading(false);
    }
  }, [appId, resumeHtml, jobDescription, atsScore?._baselineScore]);

  // Auto-trigger ATS scan when resume generation completes
  useEffect(() => {
    const prevHtml = prevResumeHtmlRef.current;
    const currentHtml = resumeHtml;
    prevResumeHtmlRef.current = currentHtml;

    if (!prevHtml && currentHtml && currentHtml.length > 100 && jobDescription && !atsAutoTriggered.current) {
      const cachedScore = app?.ats_score as unknown as AtsScoreResult | null;
      const cachedAt = app?.ats_scored_at ?? null;
      if (cachedScore && cachedAt && isCacheValid(cachedScore, cachedAt, currentHtml, jobDescription)) {
        atsAutoTriggered.current = true;
        return;
      }
      atsAutoTriggered.current = true;
      handleAtsRescan();
    }
  }, [resumeHtml, jobDescription]);

  const handleApplyBulletFix = useCallback(async (originalText: string, newText: string): Promise<boolean> => {
    if (!appId || !resumeHtml) return false;
    try {
      const escaped = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let updated = resumeHtml;
      if (updated.includes(originalText)) {
        updated = updated.replace(originalText, newText);
      } else {
        const fuzzyPattern = new RegExp(escaped.replace(/\s+/g, '\\s+'), 'i');
        updated = updated.replace(fuzzyPattern, newText);
      }
      if (updated === resumeHtml) return false;
      setResumeHtml(updated);
      await saveField({ resume_html: updated });
      return true;
    } catch {
      return false;
    }
  }, [appId, resumeHtml, setResumeHtml, saveField]);

  return {
    atsScore,
    atsLoading,
    handleAtsRescan,
    handleApplyBulletFix,
  };
}
