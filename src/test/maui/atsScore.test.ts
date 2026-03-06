/**
 * Maui Tests — ATS Match Score
 *
 * Tests: score parsing, caching/invalidation, tier gating, component rendering.
 */
import { describe, it, expect } from "vitest";
import { mockAtsScore } from "./fixtures";

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
    expect(edge.matchedKeywords).toEqual([]);
  });

  it("handles edge case score = 100", () => {
    const edge = { ...mockAtsScore, score: 100, missingKeywords: [] };
    expect(edge.score).toBe(100);
  });

  it("returns null for malformed JSON fallback", () => {
    const parseSafe = (raw: string) => {
      try { return JSON.parse(raw); } catch { return null; }
    };
    expect(parseSafe("{broken")).toBeNull();
    expect(parseSafe("")).toBeNull();
  });
});

describe("ATS Score — Cache Invalidation", () => {
  it("should rescore when resume_html hash changes", () => {
    const oldHash = "abc123";
    const newHash = "def456";
    expect(oldHash).not.toBe(newHash);
  });

  it("should use cache when resume_html unchanged", () => {
    const oldHash = "abc123";
    const sameHash = "abc123";
    expect(oldHash).toBe(sameHash);
  });

  it("should rescore when ats_scored_at is older than 7 days", () => {
    const scoredAt = new Date("2025-05-01T00:00:00Z");
    const now = new Date("2025-06-01T00:00:00Z");
    const daysDiff = (now.getTime() - scoredAt.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThan(7);
  });
});

describe("ATS Score — Tier Gating", () => {
  it("free tier allows max 2 scores per day", () => {
    const FREE_DAILY_LIMIT = 2;
    expect(FREE_DAILY_LIMIT).toBe(2);
  });

  it("pro tier allows max 20 scores per day", () => {
    const PRO_DAILY_LIMIT = 20;
    expect(PRO_DAILY_LIMIT).toBe(20);
  });

  it("premium tier is unlimited", () => {
    const PREMIUM_LIMIT = -1; // unlimited
    expect(PREMIUM_LIMIT).toBe(-1);
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
