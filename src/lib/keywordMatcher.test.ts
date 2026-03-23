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

  it("sorts missing by importance (critical first)", () => {
    const result = matchKeywords(
      [kw("Terraform", "nice_to_have"), kw("Ansible", "critical"), kw("Puppet", "preferred")],
      "I use Chef"
    );
    // All 3 should be missing, sorted: critical → preferred → nice_to_have
    expect(result.missing).toHaveLength(3);
    expect(result.missing[0].importance).toBe("critical");
    expect(result.missing[1].importance).toBe("preferred");
    expect(result.missing[2].importance).toBe("nice_to_have");
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
