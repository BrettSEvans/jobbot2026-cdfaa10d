/**
 * Maui Tests — Selective Asset Generation
 *
 * Tests: default selection per tier, pipeline filtering, backward compatibility.
 */
import { describe, it, expect } from "vitest";
import type { SubscriptionTier } from "@/lib/subscriptionTiers";

const ALL_ASSETS = ["resume", "cover_letter", "dashboard", "executive_report", "raid_log", "roadmap", "architecture_diagram", "dynamic"] as const;

function getDefaultSelection(tier: SubscriptionTier): string[] {
  switch (tier) {
    case "free":
      return ["resume", "cover_letter"];
    case "pro":
      return ["resume", "cover_letter", "dashboard", "executive_report", "raid_log", "roadmap", "architecture_diagram"];
    case "premium":
      return [...ALL_ASSETS];
  }
}

function filterPipeline(allAssets: readonly string[], selected: string[] | null): string[] {
  // Backward compat: null = generate all
  if (!selected) return [...allAssets];
  // Cover letter always included
  const result = new Set(selected);
  result.add("cover_letter");
  return [...result];
}

describe("Asset Selector — Default Selections", () => {
  it("free trial defaults to resume + cover_letter only", () => {
    const selection = getDefaultSelection("free");
    expect(selection).toEqual(["resume", "cover_letter"]);
  });

  it("pro tier defaults to all core assets", () => {
    const selection = getDefaultSelection("pro");
    expect(selection).toHaveLength(7);
    expect(selection).not.toContain("dynamic");
  });

  it("premium tier defaults to all assets including dynamic", () => {
    const selection = getDefaultSelection("premium");
    expect(selection).toHaveLength(8);
    expect(selection).toContain("dynamic");
  });
});

describe("Asset Selector — Pipeline Filtering", () => {
  it("null selectedAssets generates all (backward compat)", () => {
    const result = filterPipeline(ALL_ASSETS, null);
    expect(result).toHaveLength(ALL_ASSETS.length);
  });

  it("selected subset filters correctly", () => {
    const result = filterPipeline(ALL_ASSETS, ["resume", "dashboard"]);
    expect(result).toContain("resume");
    expect(result).toContain("dashboard");
    expect(result).toContain("cover_letter"); // always included
    expect(result).not.toContain("roadmap");
  });

  it("cover_letter always included even if not selected", () => {
    const result = filterPipeline(ALL_ASSETS, ["resume"]);
    expect(result).toContain("cover_letter");
  });

  it("dynamic total count matches selection", () => {
    const selected = ["resume", "cover_letter", "dashboard"];
    const result = filterPipeline(ALL_ASSETS, selected);
    expect(result).toHaveLength(3);
  });
});
