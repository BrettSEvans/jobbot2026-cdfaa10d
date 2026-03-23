import { describe, it, expect } from "vitest";
import { checkAtsFormatCompliance } from "./atsFormatCheck";

describe("checkAtsFormatCompliance", () => {
  it("returns 0 for empty input", () => {
    const result = checkAtsFormatCompliance("");
    expect(result.score).toBe(0);
    expect(result.checks).toHaveLength(0);
  });

  it("passes clean single-column HTML", () => {
    const html = `<h1>Summary</h1><p style="font-family: Arial;">Experienced engineer.</p><h2>Experience</h2><p>Did things.</p>`;
    const result = checkAtsFormatCompliance(html);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.checks.find((c) => c.name === "Single-column layout")!.passed).toBe(true);
  });

  it("flags grid layout", () => {
    const html = `<div style="display: grid;"><h1>Summary</h1></div>`;
    const result = checkAtsFormatCompliance(html);
    expect(result.checks.find((c) => c.name === "Single-column layout")!.passed).toBe(false);
  });

  it("flags tables", () => {
    const html = `<table><tr><td>Name</td></tr></table>`;
    const result = checkAtsFormatCompliance(html);
    expect(result.checks.find((c) => c.name === "No tables for layout")!.passed).toBe(false);
  });

  it("flags images", () => {
    const html = `<img src="photo.jpg" /><h1>Summary</h1>`;
    const result = checkAtsFormatCompliance(html);
    expect(result.checks.find((c) => c.name === "No embedded images")!.passed).toBe(false);
  });

  it("flags non-standard headings", () => {
    const html = `<h2>My Cool Section</h2><p>Text</p>`;
    const result = checkAtsFormatCompliance(html);
    expect(result.checks.find((c) => c.name === "Standard section headings")!.passed).toBe(false);
  });

  it("accepts standard headings", () => {
    const html = `<h2>Experience</h2><h2>Education</h2><h2>Skills</h2>`;
    const result = checkAtsFormatCompliance(html);
    expect(result.checks.find((c) => c.name === "Standard section headings")!.passed).toBe(true);
  });
});
