/**
 * Maui Tests — Help Entry Completeness
 *
 * Regression guards for:
 * - Every help entry has a summary (never empty)
 * - Context-aware entries have route fields
 * - Entries that describe user-facing features have steps
 * - Route matching works for parameterized paths
 * - Search returns results for key feature keywords
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerHelp, getAllHelp, getHelpForRoute, searchHelp, getHelpBySlug, type HelpMeta } from "@/lib/helpRegistry";

// We need to load helpEntries to populate the registry
// In test environment we do this by importing the side-effect module
beforeAll(async () => {
  await import("@/lib/helpEntries");
});

// Slugs that should have steps (user-facing features with actionable workflows)
const SLUGS_REQUIRING_STEPS = [
  "auth", "applications-list", "new-application", "application-detail",
  "templates", "profile", "admin-panel", "ats-score",
  "ai-chat", "asset-proposal", "change-asset", "batch-mode",
  "approval-queue", "test-users", "reset-password", "import-job",
  "onboarding-wizard", "pricing", "wysiwyg-editor",
  "save-as-template", "template-selector", "master-cover-letter",
];

// Slugs that should have route (page-specific or context-specific)
const SLUGS_REQUIRING_ROUTE = [
  "auth", "pending-approval", "applications-list", "pipeline-kanban",
  "new-application", "application-detail", "templates", "profile",
  "admin-panel", "pricing", "reset-password", "import-job",
  "ats-score", "ai-chat", "asset-proposal", "change-asset",
  "save-as-template", "wysiwyg-editor", "export-downloads",
  "style-preferences", "master-cover-letter", "resume-health-dashboard",
];

describe("Help Entries — Completeness", () => {
  it("registry is populated with entries", () => {
    expect(getAllHelp().length).toBeGreaterThan(20);
  });

  it("every entry has a non-empty summary", () => {
    for (const entry of getAllHelp()) {
      expect(entry.summary.length, `${entry.slug} missing summary`).toBeGreaterThan(10);
    }
  });

  it("every entry has a non-empty title", () => {
    for (const entry of getAllHelp()) {
      expect(entry.title.length, `${entry.slug} missing title`).toBeGreaterThan(0);
    }
  });
});

describe("Help Entries — Steps (REGRESSION)", () => {
  for (const slug of SLUGS_REQUIRING_STEPS) {
    it(`"${slug}" has steps array with at least 2 items`, () => {
      const entry = getHelpBySlug(slug);
      expect(entry, `${slug} not found in registry`).toBeDefined();
      expect(entry!.steps, `${slug} missing steps`).toBeDefined();
      expect(entry!.steps!.length, `${slug} has too few steps`).toBeGreaterThanOrEqual(2);
    });
  }
});

describe("Help Entries — Route (REGRESSION)", () => {
  for (const slug of SLUGS_REQUIRING_ROUTE) {
    it(`"${slug}" has a route field`, () => {
      const entry = getHelpBySlug(slug);
      expect(entry, `${slug} not found in registry`).toBeDefined();
      expect(entry!.route, `${slug} missing route`).toBeDefined();
      expect(entry!.route!.length).toBeGreaterThan(0);
    });
  }
});

describe("Help Entries — Route Matching", () => {
  it("matches exact route '/'", () => {
    const results = getHelpForRoute("/");
    expect(results.some((h) => h.slug === "applications-list")).toBe(true);
  });

  it("matches parameterized route '/applications/:id'", () => {
    const results = getHelpForRoute("/applications/some-uuid-here");
    const slugs = results.map((h) => h.slug);
    expect(slugs).toContain("application-detail");
    expect(slugs).toContain("ats-score");
    expect(slugs).toContain("ai-chat");
  });

  it("does not match unrelated routes", () => {
    const results = getHelpForRoute("/some-random-page");
    expect(results).toHaveLength(0);
  });
});

describe("Help Entries — Search", () => {
  it("finds ATS-related entries when searching 'ats'", () => {
    const results = searchHelp("ats");
    expect(results.some((h) => h.slug === "ats-score")).toBe(true);
  });

  it("finds resume entries when searching 'resume'", () => {
    const results = searchHelp("resume");
    expect(results.some((h) => h.slug === "resume-tab")).toBe(true);
  });

  it("returns all entries for empty search", () => {
    expect(searchHelp("").length).toBe(getAllHelp().length);
  });
});
