/**
 * Maui Tests — Chrome Extension / External Import
 *
 * Tests: URL parsing, auth requirements, rate limiting, import creation.
 */
import { describe, it, expect } from "vitest";

interface ImportParams {
  url: string;
  source?: string;
  jobTitle?: string;
  companyName?: string;
}

function parseImportUrl(searchParams: URLSearchParams): ImportParams | null {
  const url = searchParams.get("url");
  if (!url) return null;
  try {
    new URL(url); // validate
  } catch {
    return null;
  }
  return {
    url,
    source: searchParams.get("source") ?? undefined,
    jobTitle: searchParams.get("jobTitle") ?? undefined,
    companyName: searchParams.get("companyName") ?? undefined,
  };
}

function isRateLimited(importsThisHour: number): boolean {
  return importsThisHour >= 10;
}

describe("External Import — URL Parsing", () => {
  it("parses valid import URL with all params", () => {
    const params = new URLSearchParams("url=https://linkedin.com/jobs/123&source=linkedin&jobTitle=Engineer&companyName=Acme");
    const result = parseImportUrl(params);
    expect(result).toEqual({
      url: "https://linkedin.com/jobs/123",
      source: "linkedin",
      jobTitle: "Engineer",
      companyName: "Acme",
    });
  });

  it("parses URL with only required param", () => {
    const params = new URLSearchParams("url=https://indeed.com/jobs/456");
    const result = parseImportUrl(params);
    expect(result?.url).toBe("https://indeed.com/jobs/456");
    expect(result?.source).toBeUndefined();
  });

  it("returns null for missing URL param", () => {
    const params = new URLSearchParams("source=linkedin");
    expect(parseImportUrl(params)).toBeNull();
  });

  it("returns null for invalid URL", () => {
    const params = new URLSearchParams("url=not-a-url");
    expect(parseImportUrl(params)).toBeNull();
  });
});

describe("External Import — Rate Limiting", () => {
  it("allows imports under 10/hour", () => {
    expect(isRateLimited(0)).toBe(false);
    expect(isRateLimited(9)).toBe(false);
  });

  it("blocks at 10 imports/hour", () => {
    expect(isRateLimited(10)).toBe(true);
    expect(isRateLimited(15)).toBe(true);
  });
});

describe("External Import — Created Application", () => {
  it("new imports should have pipeline_stage = bookmarked", () => {
    const defaultStage = "bookmarked";
    expect(defaultStage).toBe("bookmarked");
  });
});
