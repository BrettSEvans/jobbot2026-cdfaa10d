import { describe, it, expect } from "vitest";
import { matchKeywords, type ExtractedKeyword } from "./keywordMatcher";

const kw = (keyword: string, importance: "critical" | "preferred" | "nice_to_have" = "critical"): ExtractedKeyword => ({
  keyword,
  category: "hard_skill",
  frequency: 1,
  importance,
  context: "",
});

describe("matchKeywords", () => {
  it("returns 0% for empty resume", () => {
    const result = matchKeywords([kw("React")], "");
    expect(result.matchPercent).toBe(0);
    expect(result.missing).toHaveLength(1);
  });

  it("matches exact keywords", () => {
    const result = matchKeywords([kw("React"), kw("TypeScript")], "I know React and TypeScript well");
    expect(result.matchPercent).toBe(100);
    expect(result.matched).toHaveLength(2);
  });

  it("matches synonyms (js → javascript)", () => {
    const result = matchKeywords([kw("JavaScript")], "Proficient in JS and web development");
    expect(result.matchPercent).toBe(100);
  });

  it("sorts missing by importance", () => {
    const result = matchKeywords(
      [kw("Go", "nice_to_have"), kw("Python", "critical"), kw("Rust", "preferred")],
      ""
    );
    expect(result.missing[0].keyword).toBe("Python");
    expect(result.missing[1].keyword).toBe("Rust");
    expect(result.missing[2].keyword).toBe("Go");
  });

  it("generates suggestion for critical missing", () => {
    const result = matchKeywords([kw("Kubernetes", "critical")], "I use Docker");
    expect(result.suggestions.some((s) => s.includes("Kubernetes"))).toBe(true);
  });

  it("handles empty keywords list", () => {
    const result = matchKeywords([], "some resume text");
    expect(result.matchPercent).toBe(0);
  });
});
