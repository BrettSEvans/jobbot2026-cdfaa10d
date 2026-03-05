import type { TutorialStep } from "./types";
import { getHelpBySlug } from "@/lib/helpRegistry";

const steps = new Map<string, TutorialStep>();

export function registerTutorialStep(step: TutorialStep) {
  steps.set(step.id, step);
}

/**
 * Returns tutorial steps sorted by order.
 * Steps whose helpSlug no longer exists in helpRegistry are silently skipped.
 */
export function getTutorialSteps(): TutorialStep[] {
  return Array.from(steps.values())
    .filter((s) => !!getHelpBySlug(s.helpSlug))
    .sort((a, b) => a.order - b.order);
}
