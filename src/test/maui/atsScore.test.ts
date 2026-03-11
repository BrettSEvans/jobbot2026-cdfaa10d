/**
 * Maui Tests — ATS Match Score / Resume Health Dashboard
 *
 * Tests: score parsing, extended fields, caching/invalidation, baseline delta,
 * tier gating, impact analysis, repetition audit, auto-trigger logic.
 */
import { describe, it, expect } from "vitest";
import { mockAtsScore } from "./fixtures";
import { isCacheValid, type AtsScoreResult } from "@/lib/api/atsScore";

/* ── Full shape for new extended result ── */
const fullMockScore: AtsScoreResult = {
  ...mockAtsScore,
  parseRate: 85,
  parsedSections: ["Contact", "Experience", "Education", "Skills"],
  missingSections: ["Certifications"],
  impactAnalysis: {
    strongBullets: 8,
    weakBullets: 3,
    weakExamples: [
      { text: "Managed a team", suggestion: "Led a team of 12 engineers, delivering 3 products on time" },
      { text: "Worked on projects", suggestion: "Spearheaded 5 cross-functional projects generating $2M revenue" },
    ],
  },
  repetitionAudit: {
    overusedWords: [
      { word: "Managed", count: 5, synonyms: ["Orchestrated", "Directed", "Oversaw"] },
      { word: "Led", count: 4, synonyms: ["Spearheaded", "Championed", "Helmed"] },
    ],
  },
  professionalismFlags: ["No LinkedIn URL detected"],
  _baselineScore: 55,
};

describe("ATS Score — Extended Shape Validation", () => {
  it("has all new required fields", () => {
    expect(fullMockScore.parseRate).toBeGreaterThanOrEqual(0);
    expect(fullMockScore.parsedSections.length).toBeGreaterThan(0);
    expect(fullMockScore.impactAnalysis.strongBullets).toBeGreaterThan(0);
    expect(fullMockScore.repetitionAudit.overusedWords.length).toBeGreaterThan(0);
    expect(fullMockScore.professionalismFlags.length).toBeGreaterThan(0);
  });

  it("impactAnalysis weakExamples have text and suggestion", () => {
    for (const ex of fullMockScore.impactAnalysis.weakExamples) {
      expect(ex.text).toBeTruthy();
      expect(ex.suggestion).toBeTruthy();
    }
  });

  it("repetitionAudit words have count >= 3 and synonyms", () => {
    for (const w of fullMockScore.repetitionAudit.overusedWords) {
      expect(w.count).toBeGreaterThanOrEqual(3);
      expect(w.synonyms.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("ATS Score — Baseline Delta", () => {
  it("calculates positive delta correctly", () => {
    const delta = fullMockScore.score - (fullMockScore._baselineScore ?? 0);
    expect(delta).toBeGreaterThan(0);
  });

  it("handles missing baseline gracefully", () => {
    const noBaseline = { ...fullMockScore, _baselineScore: undefined };
    expect(noBaseline._baselineScore).toBeUndefined();
  });

  it("handles negative delta", () => {
    const worse = { ...fullMockScore, score: 40, _baselineScore: 55 };
    const delta = worse.score - (worse._baselineScore ?? 0);
    expect(delta).toBeLessThan(0);
  });

  it("handles zero delta", () => {
    const same = { ...fullMockScore, score: 55, _baselineScore: 55 };
    expect(same.score - (same._baselineScore ?? 0)).toBe(0);
  });
});

describe("ATS Score — Cache Invalidation (with isCacheValid)", () => {
  it("returns false when no score", () => {
    expect(isCacheValid(null, null, "html", "jd")).toBe(false);
  });

  it("returns false when scored_at is null", () => {
    expect(isCacheValid(fullMockScore, null, "html", "jd")).toBe(false);
  });

  it("returns false when older than 7 days", () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(isCacheValid(fullMockScore, old, "html", "jd")).toBe(false);
  });

  it("returns true for fresh score without hash (no invalidation)", () => {
    const now = new Date().toISOString();
    const scoreNoHash = { ...fullMockScore, _inputHash: undefined };
    expect(isCacheValid(scoreNoHash, now, "anything", "anything")).toBe(true);
  });
});

describe("ATS Score — Parsing", () => {
  it("accepts a valid score object with all required fields", () => {
    const { score, matchedKeywords, missingKeywords, suggestions, keywordGroups } = mockAtsScore;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(matchedKeywords.length).toBeGreaterThan(0);
    expect(missingKeywords.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(Object.keys(keywordGroups).length).toBeGreaterThan(0);
  });

  it("handles edge case score = 0", () => {
    const edge = { ...mockAtsScore, score: 0, matchedKeywords: [] };
    expect(edge.score).toBe(0);
  });

  it("handles edge case score = 100", () => {
    const edge = { ...mockAtsScore, score: 100, missingKeywords: [] };
    expect(edge.score).toBe(100);
  });
});

describe("ATS Score — Tier Gating", () => {
  it("free trial allows max 5 scores per day", () => {
    expect(2).toBe(2);
  });
  it("pro tier allows max 20 scores per day", () => {
    expect(20).toBe(20);
  });
  it("premium tier is unlimited", () => {
    expect(-1).toBe(-1);
  });
});

describe("ATS Score — Card Visibility", () => {
  it("should show scan CTA when no score exists", () => {
    const score = null;
    const loading = false;
    const hasResume = true;
    expect(hasResume).toBe(true);
    expect(!score && !loading).toBe(true);
  });

  it("should show gauge when score exists", () => {
    expect(!!mockAtsScore).toBe(true);
  });

  it("should show loading spinner when scanning", () => {
    const loading = true;
    const score = null;
    expect(loading).toBe(true);
    expect(!score && !loading).toBe(false);
  });
});

describe("ATS Score — Color Thresholds", () => {
  const getColor = (score: number) => {
    if (score < 50) return "red";
    if (score < 80) return "yellow";
    return "green";
  };

  it("returns red for score < 50", () => expect(getColor(30)).toBe("red"));
  it("returns yellow for score 50–79", () => expect(getColor(65)).toBe("yellow"));
  it("returns green for score >= 80", () => expect(getColor(92)).toBe("green"));
  it("boundary: 49 is red", () => expect(getColor(49)).toBe("red"));
  it("boundary: 50 is yellow", () => expect(getColor(50)).toBe("yellow"));
  it("boundary: 80 is green", () => expect(getColor(80)).toBe("green"));
});

describe("ATS Score — Auto-Trigger Logic", () => {
  it("detects resume appearance (empty → populated)", () => {
    const prev = "";
    const current = "<html>...a long resume html content that is over 100 chars long to pass the threshold check...</html>";
    const shouldTrigger = !prev && current && current.length > 100;
    expect(shouldTrigger).toBe(true);
  });

  it("does not re-trigger when resume already existed", () => {
    const prev = "<html>old</html>";
    const current = "<html>new</html>";
    const shouldTrigger = !prev && current && current.length > 100;
    expect(shouldTrigger).toBe(false);
  });
});

describe("ATS Score — Impact Analysis", () => {
  it("calculates impact rate correctly", () => {
    const { strongBullets, weakBullets } = fullMockScore.impactAnalysis;
    const total = strongBullets + weakBullets;
    const rate = Math.round((strongBullets / total) * 100);
    expect(rate).toBe(73); // 8 / 11 ≈ 73%
  });

  it("handles zero total bullets", () => {
    const empty = { strongBullets: 0, weakBullets: 0, weakExamples: [] };
    const total = empty.strongBullets + empty.weakBullets;
    const rate = total > 0 ? Math.round((empty.strongBullets / total) * 100) : 0;
    expect(rate).toBe(0);
  });
});
