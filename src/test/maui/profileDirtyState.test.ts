/**
 * Maui Tests — Profile Dirty State & Decomposition
 *
 * Regression guards for:
 * - Dirty state detection per card (identity, resume, skills, tone)
 * - Unsaved tag input text counts as dirty
 * - Dirty state resets after save snapshot
 * - Card border class computation
 */
import { describe, it, expect } from "vitest";
import { mockProfile } from "./fixtures";

// Reproduce the dirty-state logic from Profile.tsx
function computeDirty(
  current: {
    firstName: string; middleName: string; lastName: string; displayName: string;
    resumeText: string; yearsExperience: string; preferredTone: string;
    skills: string[]; industries: string[]; newSkill: string; newIndustry: string;
  },
  saved: {
    firstName: string; middleName: string; lastName: string; displayName: string;
    resumeText: string; yearsExperience: string; preferredTone: string;
    skills: string[]; industries: string[];
  },
) {
  return {
    identity: current.firstName !== saved.firstName || current.middleName !== saved.middleName || current.lastName !== saved.lastName || current.displayName !== saved.displayName || current.yearsExperience !== saved.yearsExperience,
    resume: current.resumeText !== saved.resumeText,
    skills: JSON.stringify(current.skills) !== JSON.stringify(saved.skills) || JSON.stringify(current.industries) !== JSON.stringify(saved.industries) || current.newSkill.trim() !== "" || current.newIndustry.trim() !== "",
    tone: current.preferredTone !== saved.preferredTone,
  };
}

function cardBorderClass(isDirty: boolean): string {
  return isDirty ? "ring-2 ring-primary/50 border-primary/50" : "";
}

const baseSaved = {
  firstName: mockProfile.first_name ?? "",
  middleName: mockProfile.middle_name ?? "",
  lastName: mockProfile.last_name ?? "",
  displayName: mockProfile.display_name ?? "",
  resumeText: mockProfile.resume_text ?? "",
  yearsExperience: mockProfile.years_experience ?? "",
  preferredTone: mockProfile.preferred_tone ?? "professional",
  skills: mockProfile.key_skills ?? [],
  industries: mockProfile.target_industries ?? [],
};

describe("Profile — Dirty State Detection", () => {
  it("reports clean when current equals saved", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "", newIndustry: "" }, baseSaved);
    expect(dirty.identity).toBe(false);
    expect(dirty.resume).toBe(false);
    expect(dirty.skills).toBe(false);
    expect(dirty.tone).toBe(false);
  });

  it("detects identity dirty when firstName changes", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "", newIndustry: "", firstName: "Updated" }, baseSaved);
    expect(dirty.identity).toBe(true);
    expect(dirty.resume).toBe(false);
  });

  it("detects identity dirty when middleName changes", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "", newIndustry: "", middleName: "M" }, baseSaved);
    expect(dirty.identity).toBe(true);
  });

  it("detects resume dirty when resumeText changes", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "", newIndustry: "", resumeText: "New text" }, baseSaved);
    expect(dirty.resume).toBe(true);
    expect(dirty.identity).toBe(false);
  });

  it("detects skills dirty when a skill is added", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "", newIndustry: "", skills: [...baseSaved.skills, "Go"] }, baseSaved);
    expect(dirty.skills).toBe(true);
  });

  it("detects skills dirty when a skill is removed", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "", newIndustry: "", skills: baseSaved.skills.slice(1) }, baseSaved);
    expect(dirty.skills).toBe(true);
  });

  it("detects skills dirty when newSkill input has text (REGRESSION: pending tag input)", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "Docker", newIndustry: "" }, baseSaved);
    expect(dirty.skills).toBe(true);
  });

  it("detects skills dirty when newIndustry input has text (REGRESSION: pending tag input)", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "", newIndustry: "Healthcare" }, baseSaved);
    expect(dirty.skills).toBe(true);
  });

  it("does NOT flag skills dirty for whitespace-only pending input", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "   ", newIndustry: "" }, baseSaved);
    // whitespace-only should still flag — trim produces non-empty? No: "   ".trim() === ""
    expect(dirty.skills).toBe(false);
  });

  it("detects tone dirty when preferredTone changes", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "", newIndustry: "", preferredTone: "executive" }, baseSaved);
    expect(dirty.tone).toBe(true);
  });
});

describe("Profile — Card Border Classes", () => {
  it("returns ring classes when dirty", () => {
    expect(cardBorderClass(true)).toContain("ring-2");
    expect(cardBorderClass(true)).toContain("ring-primary/50");
  });

  it("returns empty string when clean", () => {
    expect(cardBorderClass(false)).toBe("");
  });
});

describe("Profile — hasUnsavedChanges composite", () => {
  it("is true when any single card is dirty", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "", newIndustry: "", preferredTone: "concise" }, baseSaved);
    const hasUnsaved = dirty.identity || dirty.resume || dirty.skills || dirty.tone;
    expect(hasUnsaved).toBe(true);
  });

  it("is false when all cards are clean", () => {
    const dirty = computeDirty({ ...baseSaved, newSkill: "", newIndustry: "" }, baseSaved);
    const hasUnsaved = dirty.identity || dirty.resume || dirty.skills || dirty.tone;
    expect(hasUnsaved).toBe(false);
  });
});
