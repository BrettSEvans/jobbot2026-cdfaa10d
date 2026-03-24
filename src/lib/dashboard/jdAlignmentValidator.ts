/**
 * Post-generation validation: cross-references dashboard sections against
 * JD intelligence keywords & requirements, flagging gaps before saving.
 */

import type { DashboardData, DashboardSection } from "./schema";
import type { JDIntelligence, JDRequirement, ATSKeyword } from "@/lib/api/jdIntelligence";

export interface AlignmentGap {
  type: "missing_section" | "missing_keyword" | "missing_requirement" | "structural";
  severity: "critical" | "warning" | "info";
  message: string;
}

export interface AlignmentReport {
  score: number; // 0-100
  gaps: AlignmentGap[];
  keywordCoverage: number; // 0-100
  requirementCoverage: number; // 0-100
  hasAgenticWorkforce: boolean;
  hasCfoView: boolean;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function textContainsKeyword(corpus: string, keyword: string): boolean {
  const normCorpus = normalize(corpus);
  const normKw = normalize(keyword);
  if (normCorpus.includes(normKw)) return true;
  // Check individual words for multi-word keywords
  const words = normKw.split(" ");
  if (words.length > 1) {
    return words.every((w) => normCorpus.includes(w));
  }
  return false;
}

/**
 * Build a combined text corpus from all dashboard sections for keyword matching.
 */
function buildDashboardCorpus(data: DashboardData): string {
  const parts: string[] = [];

  // Meta
  parts.push(data.meta.companyName, data.meta.jobTitle, data.meta.department || "");

  // Sections
  for (const section of data.sections) {
    parts.push(section.title, section.description || "");
    for (const m of section.metrics || []) {
      parts.push(m.label);
    }
    for (const c of section.charts || []) {
      parts.push(c.title);
      for (const ds of c.data?.datasets || []) {
        parts.push(ds.label);
      }
      for (const label of c.data?.labels || []) {
        parts.push(String(label));
      }
    }
    for (const t of section.tables || []) {
      parts.push(t.title);
      for (const col of t.columns || []) {
        parts.push(col.label);
      }
    }
  }

  // Agentic workforce
  for (const agent of data.agenticWorkforce || []) {
    parts.push(agent.name, agent.coreFunctionality, agent.interfacingTeams);
  }

  // CFO scenarios
  for (const scenario of data.cfoScenarios || []) {
    parts.push(scenario.title, scenario.description);
  }

  return parts.join(" ");
}

/**
 * Validate a generated dashboard against JD intelligence data.
 * Returns an alignment report with score and specific gaps.
 */
export function validateDashboardAlignment(
  data: DashboardData,
  jdIntelligence: JDIntelligence | null | undefined
): AlignmentReport {
  const gaps: AlignmentGap[] = [];

  // 1. Structural checks
  const hasAgenticWorkforce = data.navigation?.some((n) => n.id === "agentic-workforce") &&
    (data.agenticWorkforce?.length ?? 0) > 0;
  const hasCfoView = data.navigation?.some((n) => n.id === "cfo-view") &&
    (data.cfoScenarios?.length ?? 0) > 0;

  if (!hasAgenticWorkforce) {
    gaps.push({
      type: "structural",
      severity: "critical",
      message: "Missing Agentic Workforce section — navigation entry or data array absent",
    });
  }

  if (!hasCfoView) {
    gaps.push({
      type: "structural",
      severity: "critical",
      message: "Missing CFO View section — navigation entry or scenarios array absent",
    });
  }

  const sectionCount = data.sections?.length ?? 0;
  if (sectionCount < 4) {
    gaps.push({
      type: "structural",
      severity: "warning",
      message: `Only ${sectionCount} dashboard sections generated (expected 6-8)`,
    });
  }

  // If no JD intelligence, we can only do structural checks
  if (!jdIntelligence) {
    return {
      score: hasAgenticWorkforce && hasCfoView && sectionCount >= 4 ? 70 : 40,
      gaps,
      keywordCoverage: 0,
      requirementCoverage: 0,
      hasAgenticWorkforce: !!hasAgenticWorkforce,
      hasCfoView: !!hasCfoView,
    };
  }

  const corpus = buildDashboardCorpus(data);

  // 2. ATS keyword coverage (tier 1 = most important)
  const tier1Keywords = (jdIntelligence.ats_keywords || []).filter((k) => k.tier === 1);
  const tier2Keywords = (jdIntelligence.ats_keywords || []).filter((k) => k.tier === 2);
  const allSignificantKeywords = [...tier1Keywords, ...tier2Keywords];

  let keywordsMatched = 0;
  for (const kw of allSignificantKeywords) {
    if (textContainsKeyword(corpus, kw.keyword)) {
      keywordsMatched++;
    }
  }

  const keywordCoverage = allSignificantKeywords.length > 0
    ? Math.round((keywordsMatched / allSignificantKeywords.length) * 100)
    : 100;

  // Flag missing tier-1 keywords
  const missingTier1 = tier1Keywords.filter((kw) => !textContainsKeyword(corpus, kw.keyword));
  if (missingTier1.length > 0) {
    gaps.push({
      type: "missing_keyword",
      severity: missingTier1.length > 3 ? "critical" : "warning",
      message: `Missing ${missingTier1.length} tier-1 ATS keywords: ${missingTier1.slice(0, 5).map((k) => k.keyword).join(", ")}${missingTier1.length > 5 ? "..." : ""}`,
    });
  }

  // 3. Requirement coverage (must_have requirements)
  const mustHaveReqs = (jdIntelligence.requirements || []).filter((r) => r.category === "must_have");
  let reqsMatched = 0;
  const missingReqs: JDRequirement[] = [];
  for (const req of mustHaveReqs) {
    // Check if the requirement text or key terms appear in dashboard
    const reqWords = normalize(req.text).split(" ").filter((w) => w.length > 3);
    const matchCount = reqWords.filter((w) => normalize(corpus).includes(w)).length;
    if (matchCount >= Math.ceil(reqWords.length * 0.4)) {
      reqsMatched++;
    } else {
      missingReqs.push(req);
    }
  }

  const requirementCoverage = mustHaveReqs.length > 0
    ? Math.round((reqsMatched / mustHaveReqs.length) * 100)
    : 100;

  if (missingReqs.length > 0 && missingReqs.length <= 5) {
    gaps.push({
      type: "missing_requirement",
      severity: "warning",
      message: `${missingReqs.length} must-have requirements not reflected in dashboard sections`,
    });
  } else if (missingReqs.length > 5) {
    gaps.push({
      type: "missing_requirement",
      severity: "critical",
      message: `${missingReqs.length} must-have requirements not reflected — dashboard may not align with JD`,
    });
  }

  // 4. Job function / department alignment
  if (jdIntelligence.job_function && !textContainsKeyword(corpus, jdIntelligence.job_function)) {
    gaps.push({
      type: "missing_section",
      severity: "info",
      message: `Job function "${jdIntelligence.job_function}" not explicitly referenced in dashboard`,
    });
  }

  // 5. Calculate overall score
  const structuralScore = (hasAgenticWorkforce ? 15 : 0) + (hasCfoView ? 15 : 0) + Math.min(sectionCount / 6, 1) * 10;
  const keywordScore = (keywordCoverage / 100) * 30;
  const requirementScore = (requirementCoverage / 100) * 30;
  const score = Math.round(structuralScore + keywordScore + requirementScore);

  return {
    score: Math.min(score, 100),
    gaps,
    keywordCoverage,
    requirementCoverage,
    hasAgenticWorkforce: !!hasAgenticWorkforce,
    hasCfoView: !!hasCfoView,
  };
}
