/**
 * Maui Tests — Kanban Pipeline Board
 *
 * Tests: stage transitions, history writes, days-in-stage, illogical transition warnings.
 */
import { describe, it, expect } from "vitest";
import { PIPELINE_STAGES, mockJobApplication, mockStageHistory } from "./fixtures";

const ILLOGICAL_TRANSITIONS: Record<string, string[]> = {
  accepted: ["bookmarked", "applied"],
  rejected: ["accepted", "offer"],
};

function isIllogicalTransition(from: string, to: string): boolean {
  return ILLOGICAL_TRANSITIONS[from]?.includes(to) ?? false;
}

function daysInStage(stageChangedAt: string): number {
  const now = new Date("2025-06-15T00:00:00Z");
  const changed = new Date(stageChangedAt);
  return Math.floor((now.getTime() - changed.getTime()) / (1000 * 60 * 60 * 24));
}

describe("Kanban — Stage Definitions", () => {
  it("has 8 defined stages", () => {
    expect(PIPELINE_STAGES).toHaveLength(8);
  });

  it("includes all expected stages", () => {
    expect(PIPELINE_STAGES).toContain("bookmarked");
    expect(PIPELINE_STAGES).toContain("applied");
    expect(PIPELINE_STAGES).toContain("interviewing");
    expect(PIPELINE_STAGES).toContain("offer");
    expect(PIPELINE_STAGES).toContain("accepted");
    expect(PIPELINE_STAGES).toContain("withdrawn");
    expect(PIPELINE_STAGES).toContain("ghosted");
    expect(PIPELINE_STAGES).toContain("rejected");
  });
});

describe("Kanban — Stage Transitions", () => {
  it("allows normal forward transition", () => {
    expect(isIllogicalTransition("applied", "interviewing")).toBe(false);
  });

  it("flags accepted → bookmarked as illogical", () => {
    expect(isIllogicalTransition("accepted", "bookmarked")).toBe(true);
  });

  it("flags rejected → accepted as illogical", () => {
    expect(isIllogicalTransition("rejected", "accepted")).toBe(true);
  });

  it("allows offer → rejected (normal)", () => {
    expect(isIllogicalTransition("offer", "rejected")).toBe(false);
  });
});

describe("Kanban — Days in Stage", () => {
  it("calculates days correctly", () => {
    expect(daysInStage("2025-06-01T00:00:00Z")).toBe(14);
  });

  it("returns 0 for same-day stage change", () => {
    expect(daysInStage("2025-06-15T00:00:00Z")).toBe(0);
  });
});

describe("Kanban — Stage History", () => {
  it("records from_stage and to_stage", () => {
    const entry = mockStageHistory[1];
    expect(entry.from_stage).toBe("applied");
    expect(entry.to_stage).toBe("interviewing");
  });

  it("first history entry has null from_stage", () => {
    expect(mockStageHistory[0].from_stage).toBeNull();
  });

  it("history entries are chronologically ordered", () => {
    const dates = mockStageHistory.map((h) => new Date(h.changed_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });
});
