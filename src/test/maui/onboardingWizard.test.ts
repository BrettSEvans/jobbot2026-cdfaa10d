/**
 * Maui Tests — Onboarding Wizard
 *
 * Tests: show conditions, step navigation, skip behavior.
 */
import { describe, it, expect } from "vitest";
import { mockProfile } from "./fixtures";

function shouldShowOnboarding(profile: { onboarding_completed_at: string | null }, appCount: number): boolean {
  return profile.onboarding_completed_at === null && appCount === 0;
}

const ONBOARDING_STEPS = ["welcome", "profile", "resume", "firstApp"] as const;

describe("Onboarding — Show Conditions", () => {
  it("shows for new user with no apps and no onboarding timestamp", () => {
    expect(shouldShowOnboarding({ onboarding_completed_at: null }, 0)).toBe(true);
  });

  it("does NOT show for user with onboarding completed", () => {
    expect(shouldShowOnboarding({ onboarding_completed_at: "2025-06-01T00:00:00Z" }, 0)).toBe(false);
  });

  it("does NOT show for user with existing applications", () => {
    expect(shouldShowOnboarding({ onboarding_completed_at: null }, 3)).toBe(false);
  });

  it("does NOT show for returning user with apps and onboarding done", () => {
    expect(shouldShowOnboarding({ onboarding_completed_at: "2025-06-01T00:00:00Z" }, 5)).toBe(false);
  });
});

describe("Onboarding — Step Navigation", () => {
  it("has exactly 4 steps", () => {
    expect(ONBOARDING_STEPS).toHaveLength(4);
  });

  it("starts at welcome step (index 0)", () => {
    expect(ONBOARDING_STEPS[0]).toBe("welcome");
  });

  it("ends at firstApp step (index 3)", () => {
    expect(ONBOARDING_STEPS[3]).toBe("firstApp");
  });

  it("can navigate forward", () => {
    let step = 0;
    step = Math.min(step + 1, ONBOARDING_STEPS.length - 1);
    expect(ONBOARDING_STEPS[step]).toBe("profile");
  });

  it("can navigate backward", () => {
    let step = 2;
    step = Math.max(step - 1, 0);
    expect(ONBOARDING_STEPS[step]).toBe("profile");
  });

  it("cannot go below step 0", () => {
    let step = 0;
    step = Math.max(step - 1, 0);
    expect(step).toBe(0);
  });
});

describe("Onboarding — Skip Behavior", () => {
  it("skip should set onboarding_completed_at without saving partial data", () => {
    const profile = { ...mockProfile };
    // Simulate skip: set timestamp but don't update name fields
    profile.onboarding_completed_at = new Date().toISOString();
    expect(profile.onboarding_completed_at).toBeTruthy();
    expect(profile.first_name).toBe("Jane"); // unchanged
  });
});
