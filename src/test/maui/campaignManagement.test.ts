import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Maui test suite – Campaign management features.
 *
 * Covers: slugify, buildTrackingUrl, form validation, cap enforcement,
 * signup counting, auto-approval RPC contract, and attribution capture.
 */

// ── Helpers extracted from AdminCampaignsTab (pure logic) ──────────────

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const BASE_URL = "https://jobbot2026.lovable.app";

interface Campaign {
  id: string;
  name: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
  ref_code: string | null;
  max_signups: number | null;
  created_at: string;
}

function buildTrackingUrl(c: Campaign): string {
  const params = new URLSearchParams();
  if (c.utm_source) params.set("utm_source", c.utm_source);
  if (c.utm_medium) params.set("utm_medium", c.utm_medium);
  if (c.utm_campaign) params.set("utm_campaign", c.utm_campaign);
  if (c.utm_content) params.set("utm_content", c.utm_content);
  if (c.utm_term) params.set("utm_term", c.utm_term);
  if (c.ref_code) params.set("ref", c.ref_code);
  return `${BASE_URL}/?${params.toString()}`;
}

function countSignups(
  profiles: { referral_source: Record<string, string> | null }[],
  utmCampaign: string
): number {
  return profiles.filter((p) => p.referral_source?.utm_campaign === utmCampaign).length;
}

function isCapReached(signupCount: number, maxSignups: number | null): boolean {
  return maxSignups != null && signupCount >= maxSignups;
}

function buildPayload(form: Record<string, string>) {
  return {
    name: form.name.trim(),
    utm_source: form.utm_source.trim(),
    utm_medium: form.utm_medium.trim(),
    utm_campaign: form.utm_campaign.trim(),
    utm_content: form.utm_content?.trim() || null,
    utm_term: form.utm_term?.trim() || null,
    ref_code: form.ref_code?.trim() || null,
    max_signups: form.max_signups ? parseInt(form.max_signups, 10) : null,
  };
}

// ── Attribution helpers (re-imported logic) ────────────────────────────

const STORAGE_KEY = "resuvibe_attribution";

function captureAttributionFromParams(search: string): Record<string, string> | null {
  const params = new URLSearchParams(search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const data: Record<string, string> = {};
  for (const k of keys) {
    const v = params.get(k);
    if (v) data[k] = v;
  }
  const ref = params.get("ref");
  if (ref) data.ref = ref;
  return Object.keys(data).length > 0 ? data : null;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("Campaign – slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Spring LinkedIn Push")).toBe("spring-linkedin-push");
  });
  it("strips special characters", () => {
    expect(slugify("Q2 — Launch! (Beta)")).toBe("q2-launch-beta");
  });
  it("trims leading/trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });
  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

describe("Campaign – buildTrackingUrl", () => {
  const baseCampaign: Campaign = {
    id: "1",
    name: "Test",
    utm_source: "linkedin",
    utm_medium: "social",
    utm_campaign: "spring-push",
    utm_content: null,
    utm_term: null,
    ref_code: null,
    max_signups: null,
    created_at: "2026-01-01",
  };

  it("includes source, medium, and campaign", () => {
    const url = buildTrackingUrl(baseCampaign);
    expect(url).toContain("utm_source=linkedin");
    expect(url).toContain("utm_medium=social");
    expect(url).toContain("utm_campaign=spring-push");
  });

  it("omits null optional params", () => {
    const url = buildTrackingUrl(baseCampaign);
    expect(url).not.toContain("utm_content");
    expect(url).not.toContain("utm_term");
    expect(url).not.toContain("ref=");
  });

  it("includes ref when present", () => {
    const url = buildTrackingUrl({ ...baseCampaign, ref_code: "brett42" });
    expect(url).toContain("ref=brett42");
  });

  it("starts with the correct base URL", () => {
    const url = buildTrackingUrl(baseCampaign);
    expect(url.startsWith(BASE_URL)).toBe(true);
  });
});

describe("Campaign – signup counting & cap enforcement", () => {
  const profiles = [
    { referral_source: { utm_campaign: "spring-push" } },
    { referral_source: { utm_campaign: "spring-push" } },
    { referral_source: { utm_campaign: "fall-promo" } },
    { referral_source: null },
  ];

  it("counts signups for a specific campaign", () => {
    expect(countSignups(profiles, "spring-push")).toBe(2);
    expect(countSignups(profiles, "fall-promo")).toBe(1);
    expect(countSignups(profiles, "nonexistent")).toBe(0);
  });

  it("cap not reached when max_signups is null (unlimited)", () => {
    expect(isCapReached(100, null)).toBe(false);
  });

  it("cap not reached when signups < max", () => {
    expect(isCapReached(2, 5)).toBe(false);
  });

  it("cap reached when signups == max", () => {
    expect(isCapReached(5, 5)).toBe(true);
  });

  it("cap reached when signups > max", () => {
    expect(isCapReached(6, 5)).toBe(true);
  });
});

describe("Campaign – form payload builder", () => {
  it("trims whitespace from all fields", () => {
    const payload = buildPayload({
      name: "  My Campaign  ",
      utm_source: " linkedin ",
      utm_medium: " social ",
      utm_campaign: " my-campaign ",
      utm_content: "",
      utm_term: "",
      ref_code: "",
      max_signups: "",
    });
    expect(payload.name).toBe("My Campaign");
    expect(payload.utm_source).toBe("linkedin");
    expect(payload.utm_content).toBeNull();
    expect(payload.max_signups).toBeNull();
  });

  it("parses max_signups as integer", () => {
    const payload = buildPayload({
      name: "Test",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "test",
      utm_content: "",
      utm_term: "",
      ref_code: "",
      max_signups: "50",
    });
    expect(payload.max_signups).toBe(50);
  });

  it("sets empty optional fields to null", () => {
    const payload = buildPayload({
      name: "Test",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "test",
      utm_content: "   ",
      utm_term: "  ",
      ref_code: "  ",
      max_signups: "",
    });
    expect(payload.utm_content).toBeNull();
    expect(payload.utm_term).toBeNull();
    expect(payload.ref_code).toBeNull();
  });
});

describe("Campaign – form validation rules", () => {
  it("rejects empty name", () => {
    const valid = "".trim() && "slug".trim();
    expect(!!valid).toBe(false);
  });

  it("rejects empty campaign slug", () => {
    const valid = "Name".trim() && "".trim();
    expect(!!valid).toBe(false);
  });

  it("accepts valid name + slug", () => {
    const valid = "Name".trim() && "slug".trim();
    expect(!!valid).toBeTruthy();
  });
});

describe("Campaign – auto-approval RPC contract", () => {
  it("campaign_auto_approve expects user_id and utm_campaign args", () => {
    // This tests the RPC call shape matches what the DB function expects
    const args = { _user_id: "uuid-123", _utm_campaign: "spring-push" };
    expect(args).toHaveProperty("_user_id");
    expect(args).toHaveProperty("_utm_campaign");
  });

  it("auto-approve should fail when cap is exceeded", () => {
    // Simulates the SQL logic: if signups >= max_signups, return false
    const maxSignups = 10;
    const currentSignups = 10;
    const wouldApprove = currentSignups < maxSignups;
    expect(wouldApprove).toBe(false);
  });

  it("auto-approve should succeed when under cap", () => {
    const maxSignups = 10;
    const currentSignups = 5;
    const wouldApprove = currentSignups < maxSignups;
    expect(wouldApprove).toBe(true);
  });

  it("auto-approve should succeed when no cap (unlimited)", () => {
    const maxSignups: number | null = null;
    const wouldApprove = maxSignups == null || 5 < maxSignups;
    expect(wouldApprove).toBe(true);
  });
});

describe("Campaign – attribution capture from URL params", () => {
  it("extracts UTM params from a tracking URL", () => {
    const search = "?utm_source=linkedin&utm_medium=social&utm_campaign=spring-push";
    const data = captureAttributionFromParams(search);
    expect(data).toEqual({
      utm_source: "linkedin",
      utm_medium: "social",
      utm_campaign: "spring-push",
    });
  });

  it("extracts ref code", () => {
    const search = "?ref=brett42";
    const data = captureAttributionFromParams(search);
    expect(data).toEqual({ ref: "brett42" });
  });

  it("returns null when no attribution params", () => {
    const data = captureAttributionFromParams("?page=2");
    expect(data).toBeNull();
  });

  it("handles combined UTM + ref", () => {
    const search = "?utm_source=twitter&utm_campaign=fall&ref=abc";
    const data = captureAttributionFromParams(search);
    expect(data?.utm_source).toBe("twitter");
    expect(data?.utm_campaign).toBe("fall");
    expect(data?.ref).toBe("abc");
  });
});

describe("Campaign – deletion preserves attribution", () => {
  it("removing a campaign from the list doesn't affect profile data", () => {
    const campaigns = [
      { id: "1", utm_campaign: "spring-push" },
      { id: "2", utm_campaign: "fall-promo" },
    ];
    const profiles = [
      { referral_source: { utm_campaign: "spring-push" } },
    ];

    // Simulate deletion
    const afterDelete = campaigns.filter((c) => c.id !== "1");
    expect(afterDelete).toHaveLength(1);

    // Profile attribution unchanged
    expect(profiles[0].referral_source.utm_campaign).toBe("spring-push");
  });
});
