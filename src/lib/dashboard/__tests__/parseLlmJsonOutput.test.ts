import { describe, it, expect } from "vitest";
import { parseLlmJsonOutput } from "../assembler";

/** Minimal valid DashboardData JSON */
const validData = {
  meta: { companyName: "Acme", jobTitle: "TPM", department: "Eng" },
  branding: {
    primary: "#000", onPrimary: "#fff", primaryContainer: "#eee",
    onPrimaryContainer: "#111", secondary: "#222", onSecondary: "#fff",
    surface: "#fff", onSurface: "#000", surfaceVariant: "#ccc",
    outline: "#999", error: "#f00", fontHeading: "Arial", fontBody: "Arial",
  },
  navigation: [{ id: "overview", label: "Overview", icon: "dashboard" }],
  sections: [{ id: "s1", title: "Section 1", description: "Desc" }],
  agenticWorkforce: [],
  cfoScenarios: [],
};

const validJson = JSON.stringify(validData);

describe("parseLlmJsonOutput", () => {
  // --- Happy paths ---
  it("parses clean JSON", () => {
    const result = parseLlmJsonOutput(validJson);
    expect(result).not.toBeNull();
    expect(result!.meta.companyName).toBe("Acme");
  });

  it("parses JSON wrapped in ```json fences", () => {
    const raw = "```json\n" + validJson + "\n```";
    expect(parseLlmJsonOutput(raw)).not.toBeNull();
  });

  it("parses JSON wrapped in ``` fences (no language tag)", () => {
    const raw = "```\n" + validJson + "\n```";
    expect(parseLlmJsonOutput(raw)).not.toBeNull();
  });

  it("parses JSON with leading prose before the first {", () => {
    const raw = "Here is the dashboard data:\n\n" + validJson;
    expect(parseLlmJsonOutput(raw)?.meta.companyName).toBe("Acme");
  });

  it("parses JSON with trailing text after the last }", () => {
    const raw = validJson + "\n\nLet me know if you need changes!";
    expect(parseLlmJsonOutput(raw)?.meta.companyName).toBe("Acme");
  });

  it("handles surrounding whitespace and newlines", () => {
    const raw = "\n\n   " + validJson + "   \n\n";
    expect(parseLlmJsonOutput(raw)).not.toBeNull();
  });

  // --- LLM sanitization ---
  it("removes trailing commas before } and ]", () => {
    const withTrailing = validJson
      .replace('"agenticWorkforce":[]', '"agenticWorkforce":[],')
      .replace('"cfoScenarios":[]', '"cfoScenarios":[],');
    expect(parseLlmJsonOutput(withTrailing)).not.toBeNull();
  });

  it("replaces new Date('...').getTime() with timestamp", () => {
    const raw = validJson.replace(
      '"department":"Eng"',
      '"department":"Eng","timestamp":new Date("2025-06-15T00:00:00Z").getTime()'
    );
    const result = parseLlmJsonOutput(raw);
    expect(result).not.toBeNull();
  });

  it("replaces new Date('...') with date string", () => {
    const raw = validJson.replace(
      '"department":"Eng"',
      '"department":"Eng","created":new Date("2025-01-01")'
    );
    const result = parseLlmJsonOutput(raw);
    expect(result).not.toBeNull();
  });

  it("replaces new Date() (no args) with fallback string", () => {
    const raw = validJson.replace(
      '"department":"Eng"',
      '"department":"Eng","now":new Date()'
    );
    const result = parseLlmJsonOutput(raw);
    expect(result).not.toBeNull();
  });

  // --- Validation failures ---
  it("returns null for missing meta field", () => {
    const noMeta = { ...validData, meta: undefined };
    expect(parseLlmJsonOutput(JSON.stringify(noMeta))).toBeNull();
  });

  it("returns null for missing branding field", () => {
    const noBranding = { ...validData, branding: undefined };
    expect(parseLlmJsonOutput(JSON.stringify(noBranding))).toBeNull();
  });

  it("returns null for missing navigation field", () => {
    const noNav = { ...validData, navigation: undefined };
    expect(parseLlmJsonOutput(JSON.stringify(noNav))).toBeNull();
  });

  it("returns null for missing sections field", () => {
    const noSections = { ...validData, sections: undefined };
    expect(parseLlmJsonOutput(JSON.stringify(noSections))).toBeNull();
  });

  // --- Garbage inputs ---
  it("returns null for empty string", () => {
    expect(parseLlmJsonOutput("")).toBeNull();
  });

  it("returns null for plain text with no braces", () => {
    expect(parseLlmJsonOutput("Here is your dashboard data.")).toBeNull();
  });

  it("returns null for invalid JSON inside braces", () => {
    expect(parseLlmJsonOutput("{ not valid json }")).toBeNull();
  });

  it("returns null for valid JSON missing required fields", () => {
    expect(parseLlmJsonOutput('{"foo": "bar"}')).toBeNull();
  });

  it("returns null for an array instead of an object", () => {
    expect(parseLlmJsonOutput("[1, 2, 3]")).toBeNull();
  });
});
