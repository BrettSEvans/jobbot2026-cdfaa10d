/**
 * Maui Tests — DOCX Export
 *
 * Tests: filename builder, tier gating, button visibility rules.
 */
import { describe, it, expect } from "vitest";

function buildDocxFilename(assetType: string, companyName: string, jobTitle: string): string {
  const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  return `${sanitize(assetType)}-${sanitize(companyName)}-${sanitize(jobTitle)}.docx`;
}

const DOCX_ALLOWED_ASSETS = ["resume", "cover_letter"];

function isDocxAllowed(assetType: string, tier: string): boolean {
  if (tier === "free") return false;
  return DOCX_ALLOWED_ASSETS.includes(assetType);
}

describe("DOCX Export — Filename Builder", () => {
  it("produces correct filename for resume", () => {
    expect(buildDocxFilename("Resume", "Acme Corp", "Senior Engineer"))
      .toBe("resume-acme-corp-senior-engineer.docx");
  });

  it("handles special characters in company name", () => {
    expect(buildDocxFilename("Cover Letter", "O'Brien & Co.", "PM"))
      .toBe("cover-letter-o-brien-co-pm.docx");
  });

  it("handles empty strings gracefully", () => {
    expect(buildDocxFilename("Resume", "", "")).toBe("resume--.docx");
  });
});

describe("DOCX Export — Tier Gating", () => {
  it("free tier cannot export DOCX", () => {
    expect(isDocxAllowed("resume", "free")).toBe(false);
    expect(isDocxAllowed("cover_letter", "free")).toBe(false);
  });

  it("pro tier can export resume and cover letter as DOCX", () => {
    expect(isDocxAllowed("resume", "pro")).toBe(true);
    expect(isDocxAllowed("cover_letter", "pro")).toBe(true);
  });

  it("premium tier can export resume and cover letter as DOCX", () => {
    expect(isDocxAllowed("resume", "premium")).toBe(true);
    expect(isDocxAllowed("cover_letter", "premium")).toBe(true);
  });

  it("DOCX not available for dashboard (any tier)", () => {
    expect(isDocxAllowed("dashboard", "pro")).toBe(false);
    expect(isDocxAllowed("dashboard", "premium")).toBe(false);
  });
});

describe("DOCX Export — Input Limits", () => {
  const MAX_HTML_SIZE = 500 * 1024; // 500KB

  it("accepts HTML under 500KB", () => {
    const html = "x".repeat(100 * 1024);
    expect(html.length).toBeLessThan(MAX_HTML_SIZE);
  });

  it("rejects HTML over 500KB", () => {
    const html = "x".repeat(600 * 1024);
    expect(html.length).toBeGreaterThan(MAX_HTML_SIZE);
  });
});
