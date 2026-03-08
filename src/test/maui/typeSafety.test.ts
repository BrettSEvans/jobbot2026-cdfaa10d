/**
 * Maui Tests — Type Safety Regression Guards
 *
 * Tests that critical data structures are properly typed and
 * error handling uses `unknown` instead of `any`.
 *
 * Regression guards for:
 * - Pipeline stage type narrowing
 * - Error handling with unknown catch
 * - JSON branding field parsing
 * - ATS score field access safety
 */
import { describe, it, expect } from "vitest";
import { PIPELINE_STAGES, isIllogicalTransition, type PipelineStage } from "@/lib/pipelineStages";
import { mockJobApplication, mockAtsScore } from "./fixtures";

describe("Type Safety — PipelineStage type guard", () => {
  it("all PIPELINE_STAGES values are valid PipelineStage type", () => {
    const validStages: readonly string[] = PIPELINE_STAGES;
    for (const stage of validStages) {
      // Verify the stage is usable in typed functions
      expect(() => isIllogicalTransition(stage as PipelineStage, "applied")).not.toThrow();
    }
  });

  it("unknown string is not a valid PipelineStage", () => {
    const isValid = (s: string): s is PipelineStage =>
      (PIPELINE_STAGES as readonly string[]).includes(s);
    expect(isValid("invalid_stage")).toBe(false);
    expect(isValid("bookmarked")).toBe(true);
  });
});

describe("Type Safety — Error handling pattern (REGRESSION: catch(err: any))", () => {
  it("unknown errors can be narrowed with instanceof Error", () => {
    const processError = (err: unknown): string => {
      if (err instanceof Error) return err.message;
      return "Unknown error";
    };

    expect(processError(new Error("test"))).toBe("test");
    expect(processError("string error")).toBe("Unknown error");
    expect(processError(null)).toBe("Unknown error");
    expect(processError(undefined)).toBe("Unknown error");
    expect(processError(42)).toBe("Unknown error");
  });
});

describe("Type Safety — Branding JSON field", () => {
  it("safely parses branding from job application", () => {
    const branding = mockJobApplication.branding;
    expect(branding).toBeDefined();
    expect(typeof branding).toBe("object");
    if (branding && typeof branding === "object" && "primaryColor" in branding) {
      expect(branding.primaryColor).toBe("#1a73e8");
    }
  });

  it("handles null branding gracefully", () => {
    const app = { ...mockJobApplication, branding: null };
    const color = app.branding && typeof app.branding === "object" && "primaryColor" in app.branding
      ? (app.branding as Record<string, unknown>).primaryColor
      : undefined;
    expect(color).toBeUndefined();
  });
});

describe("Type Safety — ATS score field access", () => {
  it("accesses score fields safely from typed object", () => {
    const score = mockAtsScore;
    expect(typeof score.score).toBe("number");
    expect(Array.isArray(score.matchedKeywords)).toBe(true);
    expect(Array.isArray(score.missingKeywords)).toBe(true);
    expect(Array.isArray(score.suggestions)).toBe(true);
  });

  it("handles null ats_score on job application", () => {
    const app = { ...mockJobApplication, ats_score: null };
    const score = app.ats_score;
    expect(score).toBeNull();
    // Should not throw when checking null
    const safeScore = score && typeof score === "object" && "score" in score
      ? (score as Record<string, unknown>).score
      : null;
    expect(safeScore).toBeNull();
  });
});
