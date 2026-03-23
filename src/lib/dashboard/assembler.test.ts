import { describe, it, expect } from "vitest";
import { parseLlmJsonOutput } from "./assembler";

const validData = {
  meta: { companyName: "Acme", jobTitle: "Engineer", department: "Eng" },
  branding: { primary: "#000", onPrimary: "#fff", primaryContainer: "#eee", onPrimaryContainer: "#111", secondary: "#222", onSecondary: "#fff", surface: "#fff", onSurface: "#000", surfaceVariant: "#f5f5f5", outline: "#ccc", error: "#f00", fontHeading: "Arial", fontBody: "Arial" },
  navigation: [{ id: "n1", label: "Overview", icon: "dashboard" }],
  sections: [{ id: "s1", title: "Overview", description: "Desc" }],
  agenticWorkforce: [],
  cfoScenarios: [],
};

describe("parseLlmJsonOutput", () => {
  it("parses valid JSON", () => {
    const result = parseLlmJsonOutput(JSON.stringify(validData));
    expect(result).not.toBeNull();
    expect(result!.meta.companyName).toBe("Acme");
  });

  it("strips markdown fences", () => {
    const raw = "```json\n" + JSON.stringify(validData) + "\n```";
    const result = parseLlmJsonOutput(raw);
    expect(result).not.toBeNull();
    expect(result!.meta.jobTitle).toBe("Engineer");
  });

  it("handles conversational text around JSON", () => {
    const raw = "Here is the dashboard:\n" + JSON.stringify(validData) + "\nLet me know if you need changes.";
    const result = parseLlmJsonOutput(raw);
    expect(result).not.toBeNull();
  });

  it("removes trailing commas before closing brackets", () => {
    // Simple case: trailing comma before }
    const raw = '{"meta":{"companyName":"Acme","jobTitle":"Eng","department":"X",},"branding":' + JSON.stringify(validData.branding) + ',"navigation":' + JSON.stringify(validData.navigation) + ',"sections":' + JSON.stringify(validData.sections) + ',"agenticWorkforce":[],"cfoScenarios":[]}';
    const result = parseLlmJsonOutput(raw);
    expect(result).not.toBeNull();
  });

  it("returns null for missing required fields", () => {
    const result = parseLlmJsonOutput(JSON.stringify({ meta: {} }));
    expect(result).toBeNull();
  });

  it("returns null for non-JSON", () => {
    const result = parseLlmJsonOutput("This is not JSON at all");
    expect(result).toBeNull();
  });

  it("handles new Date() expressions", () => {
    const raw = JSON.stringify(validData).replace('"Acme"', 'new Date("2025-01-01")');
    // This won't parse to valid meta but tests the replacement
    const result = parseLlmJsonOutput(raw);
    // companyName becomes the date string
    expect(result).not.toBeNull();
  });
});
