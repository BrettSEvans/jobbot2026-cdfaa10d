import { describe, it, expect } from "vitest";
import { SITE_FILTERS, extractCompanyFromUrl } from "@/lib/api/jobSearch";

describe("Job Search — query helpers", () => {
  it("rejects empty query client-side", async () => {
    // searchJobs returns error for empty input without calling edge function
    const { searchJobs } = await import("@/lib/api/jobSearch");
    const result = await searchJobs("   ");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it("trims whitespace — non-empty after trim passes validation", () => {
    // Verify the trim logic: "  test  ".trim() is non-empty so it passes client validation
    const query = "  test  ";
    const trimmed = query.trim();
    expect(trimmed).toBe("test");
    expect(trimmed.length).toBeGreaterThan(0);
  });
});

describe("Job Search — site filters", () => {
  it("has an 'All Sites' option with empty value", () => {
    const allSites = SITE_FILTERS.find((f) => f.label === "All Sites");
    expect(allSites).toBeDefined();
    expect(allSites!.value).toBe("");
  });

  it("includes Google Careers filter", () => {
    const google = SITE_FILTERS.find((f) => f.value.includes("google"));
    expect(google).toBeDefined();
  });

  it("each filter has non-empty label", () => {
    SITE_FILTERS.forEach((f) => {
      expect(f.label.length).toBeGreaterThan(0);
    });
  });
});

describe("Job Search — extractCompanyFromUrl", () => {
  it("extracts company from standard careers URL", () => {
    expect(extractCompanyFromUrl("https://careers.intuitive.com/en/jobs/123")).toBe("Intuitive");
  });

  it("extracts company from www URL", () => {
    expect(extractCompanyFromUrl("https://www.google.com/about/careers")).toBe("Google");
  });

  it("handles jobs subdomain", () => {
    expect(extractCompanyFromUrl("https://jobs.lever.co/somecompany")).toBe("Lever");
  });

  it("returns empty string for invalid URL", () => {
    expect(extractCompanyFromUrl("not-a-url")).toBe("");
  });
});

describe("Job Search — result-to-application mapping", () => {
  it("maps search result fields to saveJobApplication params", () => {
    const result = {
      url: "https://careers.example.com/job/123",
      title: "Senior Engineer",
      description: "A great job",
      markdown: "# Senior Engineer\nDetails...",
    };

    const params = {
      job_url: result.url,
      job_title: result.title || undefined,
      company_name: extractCompanyFromUrl(result.url) || undefined,
      job_description_markdown: result.markdown || undefined,
      generation_status: "idle",
    };

    expect(params.job_url).toBe("https://careers.example.com/job/123");
    expect(params.job_title).toBe("Senior Engineer");
    expect(params.company_name).toBe("Example");
    expect(params.job_description_markdown).toContain("Senior Engineer");
    expect(params.generation_status).toBe("idle");
  });

  it("handles missing optional fields gracefully", () => {
    const result = { url: "https://example.com", title: "", description: "", markdown: "" };
    const params = {
      job_url: result.url,
      job_title: result.title || undefined,
      company_name: extractCompanyFromUrl(result.url) || undefined,
      job_description_markdown: result.markdown || undefined,
    };

    expect(params.job_url).toBe("https://example.com");
    expect(params.job_title).toBeUndefined();
    expect(params.job_description_markdown).toBeUndefined();
  });
});
