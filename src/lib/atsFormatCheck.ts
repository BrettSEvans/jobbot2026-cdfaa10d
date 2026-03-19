/**
 * ATS Format Compliance Checker
 * Client-side HTML parser that validates resume structure against ATS rules.
 */

export interface FormatCheck {
  name: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message: string;
  fix?: string;
}

export interface FormatComplianceResult {
  score: number;
  checks: FormatCheck[];
}

const ALLOWED_HEADINGS = new Set([
  "summary", "professional summary", "objective", "profile",
  "experience", "work experience", "professional experience", "employment",
  "education", "academic background",
  "skills", "technical skills", "core competencies", "key skills",
  "certifications", "certificates", "licenses",
  "projects", "key projects",
  "awards", "honors", "achievements",
  "publications", "languages", "volunteer", "interests",
]);

export function checkAtsFormatCompliance(html: string): FormatComplianceResult {
  if (!html) return { score: 0, checks: [] };

  const checks: FormatCheck[] = [];
  const lower = html.toLowerCase();

  // 1. Multi-column detection
  const hasGrid = /display\s*:\s*grid/i.test(html);
  const hasFlexRow = /display\s*:\s*flex[\s\S]{0,50}flex-direction\s*:\s*row/i.test(html) ||
    (/display\s*:\s*flex/i.test(html) && !/flex-direction\s*:\s*column/i.test(html) && /display\s*:\s*flex[\s\S]{0,200}width\s*:\s*\d+%/i.test(html));
  const hasFloats = /float\s*:\s*(left|right)/gi.test(html);
  const hasColumns = /column-count|columns\s*:/i.test(html);

  checks.push({
    name: "Single-column layout",
    passed: !hasGrid && !hasFlexRow && !hasFloats && !hasColumns,
    severity: "error",
    message: hasGrid || hasFlexRow || hasFloats || hasColumns
      ? "Multi-column layout detected — most ATS systems read left-to-right, line-by-line"
      : "Single-column layout — ATS-safe ✓",
    fix: "Convert to a single-column layout with full-width sections stacked vertically.",
  });

  // 2. Heading validation
  const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
  const headings: string[] = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (text) headings.push(text);
  }
  const nonStandard = headings.filter((h) => !ALLOWED_HEADINGS.has(h));
  checks.push({
    name: "Standard section headings",
    passed: nonStandard.length === 0,
    severity: "warning",
    message: nonStandard.length > 0
      ? `Non-standard headings found: ${nonStandard.map((h) => `"${h}"`).join(", ")} — ATS may not categorize these correctly`
      : "All section headings are ATS-standard ✓",
    fix: nonStandard.length > 0
      ? `Rename to standard headings: ${nonStandard.map((h) => `"${h}" → closest standard name`).join("; ")}`
      : undefined,
  });

  // 3. Table detection
  const hasTable = /<table/i.test(html);
  checks.push({
    name: "No tables for layout",
    passed: !hasTable,
    severity: "error",
    message: hasTable
      ? "HTML tables detected — ATS often misreads table-based layouts"
      : "No layout tables — ATS-safe ✓",
    fix: "Replace tables with simple lists or paragraphs.",
  });

  // 4. Image detection
  const hasImg = /<img\s/i.test(html);
  const hasSvg = /<svg/i.test(html);
  const hasBgImage = /background-image/i.test(html);
  const hasImages = hasImg || hasSvg || hasBgImage;
  checks.push({
    name: "No embedded images",
    passed: !hasImages,
    severity: "warning",
    message: hasImages
      ? "Images/SVGs detected — ATS cannot read text inside images"
      : "No embedded images — ATS-safe ✓",
    fix: "Remove images and replace with text equivalents.",
  });

  // 5. Font check
  const fontRegex = /font-family\s*:\s*([^;}"]+)/gi;
  const fonts = new Set<string>();
  while ((match = fontRegex.exec(html)) !== null) {
    match[1].split(",").forEach((f) => {
      const clean = f.trim().replace(/['"]/g, "").toLowerCase();
      if (clean) fonts.add(clean);
    });
  }
  const safeFonts = new Set(["arial", "helvetica", "times new roman", "times", "georgia", "verdana", "calibri", "cambria", "garamond", "sans-serif", "serif", "monospace", "courier", "courier new", "trebuchet ms", "tahoma"]);
  const unsafeFonts = [...fonts].filter((f) => !safeFonts.has(f));
  checks.push({
    name: "ATS-safe fonts",
    passed: unsafeFonts.length === 0,
    severity: "warning",
    message: unsafeFonts.length > 0
      ? `Non-standard fonts: ${unsafeFonts.join(", ")} — some ATS may not render these`
      : "All fonts are ATS-standard ✓",
    fix: unsafeFonts.length > 0 ? "Use Arial, Calibri, or Times New Roman." : undefined,
  });

  // 6. Inline styles overload
  const inlineStyleCount = (html.match(/style="/gi) || []).length;
  checks.push({
    name: "Minimal inline styles",
    passed: inlineStyleCount < 30,
    severity: "info",
    message: inlineStyleCount >= 30
      ? `${inlineStyleCount} inline styles found — excessive styling can confuse ATS parsers`
      : `${inlineStyleCount} inline styles — acceptable ✓`,
  });

  // 7. Special characters
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/u.test(html);
  checks.push({
    name: "No emoji or special icons",
    passed: !hasEmoji,
    severity: "warning",
    message: hasEmoji
      ? "Emoji/special characters detected — ATS may display these as garbled text"
      : "No emoji or special characters ✓",
    fix: "Replace emoji with text equivalents.",
  });

  // Calculate score
  const weights: Record<string, number> = { error: 25, warning: 10, info: 5 };
  const maxDeduction = checks.reduce((sum, c) => sum + weights[c.severity], 0);
  const actualDeduction = checks.filter((c) => !c.passed).reduce((sum, c) => sum + weights[c.severity], 0);
  const score = Math.max(0, Math.round(100 - (actualDeduction / maxDeduction) * 100));

  return { score, checks };
}
