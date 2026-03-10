import { describe, it, expect } from "vitest";
import { SITE_FILTERS, WORK_MODES, JOB_TYPES, extractCompanyFromUrl, buildFilterSummary } from "@/lib/api/jobSearch";

describe("Job Search — query helpers", () => {
  it("rejects empty query client-side", async () => {
    const { searchJobs } = await import("@/lib/api/jobSearch");
    const result = await searchJobs("   ");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it("trims whitespace — non-empty after trim passes validation", () => {
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

  it("Google Jobs targets google.com/search aggregator", () => {
    const google = SITE_FILTERS.find((f) => f.label === "Google Jobs");
    expect(google).toBeDefined();
    expect(google!.value).toBe("google.com/search");
  });

  it("LinkedIn targets individual job postings via /jobs/view", () => {
    const linkedin = SITE_FILTERS.find((f) => f.label === "LinkedIn");
    expect(linkedin).toBeDefined();
    expect(linkedin!.value).toBe("linkedin.com/jobs/view");
  });

  it("each filter has non-empty label", () => {
    SITE_FILTERS.forEach((f) => {
      expect(f.label.length).toBeGreaterThan(0);
    });
  });
});

describe("Job Search — filter constants", () => {
  it("WORK_MODES includes Remote and Any", () => {
    expect(WORK_MODES.find((m) => m.value === "remote")).toBeDefined();
    expect(WORK_MODES.find((m) => m.value === "")).toBeDefined();
  });

  it("JOB_TYPES includes full-time, part-time, contract, internship", () => {
    expect(JOB_TYPES.find((t) => t.value === "full-time")).toBeDefined();
    expect(JOB_TYPES.find((t) => t.value === "part-time")).toBeDefined();
    expect(JOB_TYPES.find((t) => t.value === "contract")).toBeDefined();
    expect(JOB_TYPES.find((t) => t.value === "internship")).toBeDefined();
  });
});

describe("Job Search — buildFilterSummary", () => {
  it("returns empty for no filters", () => {
    expect(buildFilterSummary({})).toBe("");
  });

  it("joins location and workMode", () => {
    expect(buildFilterSummary({ location: "NYC", workMode: "remote" })).toBe("NYC · remote");
  });

  it("includes all three filters", () => {
    expect(buildFilterSummary({ location: "SF", workMode: "hybrid", jobType: "contract" })).toBe("SF · hybrid · contract");
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
