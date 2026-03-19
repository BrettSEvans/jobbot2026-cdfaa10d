/**
 * Keyword matcher: compares extracted JD keywords against user's resume text.
 * Pure client-side — no AI call needed.
 */

export interface ExtractedKeyword {
  keyword: string;
  category: "hard_skill" | "tool" | "certification" | "methodology" | "domain" | "soft_skill";
  frequency: number;
  importance: "critical" | "preferred" | "nice_to_have";
  context: string;
}

export interface KeywordMatchResult {
  matchPercent: number;
  matched: ExtractedKeyword[];
  missing: ExtractedKeyword[];
  suggestions: string[];
}

// Common tech synonym pairs for fuzzy matching
const SYNONYM_MAP: Record<string, string[]> = {
  javascript: ["js", "ecmascript"],
  typescript: ["ts"],
  "react.js": ["react", "reactjs"],
  "node.js": ["node", "nodejs"],
  "vue.js": ["vue", "vuejs"],
  "next.js": ["next", "nextjs"],
  kubernetes: ["k8s"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "amazon web services": ["aws"],
  "google cloud platform": ["gcp"],
  "microsoft azure": ["azure"],
  postgresql: ["postgres"],
  mongodb: ["mongo"],
  "ci/cd": ["cicd", "continuous integration", "continuous deployment"],
  "rest api": ["restful", "rest apis"],
  graphql: ["gql"],
  docker: ["containerization"],
  "data science": ["data analytics"],
  devops: ["dev ops"],
  python: ["py"],
  "ruby on rails": ["rails", "ror"],
  "c++": ["cpp"],
  "c#": ["csharp", "c sharp"],
};

// Build reverse lookup
const REVERSE_SYNONYMS: Map<string, string[]> = new Map();
for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
  const allForms = [canonical, ...synonyms];
  for (const form of allForms) {
    const existing = REVERSE_SYNONYMS.get(form.toLowerCase()) || [];
    REVERSE_SYNONYMS.set(form.toLowerCase(), [...new Set([...existing, ...allForms])]);
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function keywordInText(keyword: string, normalizedText: string): boolean {
  const normalizedKeyword = normalize(keyword);

  // Direct match
  if (normalizedText.includes(normalizedKeyword)) return true;

  // Synonym matching
  const synonyms = REVERSE_SYNONYMS.get(normalizedKeyword);
  if (synonyms) {
    for (const syn of synonyms) {
      if (normalizedText.includes(normalize(syn))) return true;
    }
  }

  // Partial match for multi-word phrases (all words present nearby)
  const words = normalizedKeyword.split(" ");
  if (words.length > 1) {
    return words.every((w) => normalizedText.includes(w));
  }

  return false;
}

export function matchKeywords(
  keywords: ExtractedKeyword[],
  resumeText: string
): KeywordMatchResult {
  if (!resumeText || !keywords.length) {
    return { matchPercent: 0, matched: [], missing: keywords, suggestions: [] };
  }

  const normalizedResume = normalize(resumeText);
  const matched: ExtractedKeyword[] = [];
  const missing: ExtractedKeyword[] = [];

  for (const kw of keywords) {
    if (keywordInText(kw.keyword, normalizedResume)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  // Sort missing: critical first, then preferred, then nice_to_have
  const importanceOrder: Record<string, number> = { critical: 0, preferred: 1, nice_to_have: 2 };
  missing.sort((a, b) => (importanceOrder[a.importance] ?? 2) - (importanceOrder[b.importance] ?? 2));

  const matchPercent = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0;

  const suggestions: string[] = [];
  const criticalMissing = missing.filter((k) => k.importance === "critical");
  if (criticalMissing.length > 0) {
    suggestions.push(
      `Add these critical keywords to your resume: ${criticalMissing.map((k) => k.keyword).join(", ")}`
    );
  }
  if (matchPercent < 60) {
    suggestions.push("ATS match is below 60% — consider tailoring your resume more closely to this JD.");
  }
  if (matchPercent >= 80) {
    suggestions.push("Strong ATS match! Focus on quantifying your achievements for maximum impact.");
  }

  return { matchPercent, matched, missing, suggestions };
}
