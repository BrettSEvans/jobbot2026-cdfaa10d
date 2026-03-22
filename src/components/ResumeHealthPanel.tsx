import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { extractJdKeywords } from "@/lib/api/keywordExtraction";
import { matchKeywords, type ExtractedKeyword, type KeywordMatchResult } from "@/lib/keywordMatcher";
import { checkAtsFormatCompliance, type FormatComplianceResult } from "@/lib/atsFormatCheck";
import { supabase } from "@/integrations/supabase/client";
import ResumeDiffViewer from "@/components/ResumeDiffViewer";
import type { BulletChange } from "@/lib/api/resumeDiff";
import {
  Activity,
  Target,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Lightbulb,
  SkipForward,
  GitCompare,
} from "lucide-react";

/* ── Types ── */

interface BulletAnalysis {
  original: string;
  strength: "strong" | "needs_work" | "weak";
  issue?: string;
  question?: string;
  suggestion?: string;
}

interface ResumeHealthPanelProps {
  resumeHtml: string;
  jobDescription: string;
  resumeText: string | null;
  companyName?: string;
  jobTitle?: string;
  onOptimize?: (missingKeywords: ExtractedKeyword[], userPrompt?: string) => void;
  onApplyBulletFix?: (original: string, replacement: string) => void;
  onAcceptFabrication?: (change: BulletChange) => void;
  onRevertFabrication?: (change: BulletChange) => void;
  revisions?: Array<{ id: string; label: string; html: string; revision_number: number }>;
}

/* ── Helpers ── */

type HealthLevel = "green" | "yellow" | "red";

function getLevel(pct: number): HealthLevel {
  if (pct >= 80) return "green";
  if (pct >= 60) return "yellow";
  return "red";
}

const levelColors: Record<HealthLevel, { dot: string; text: string; bg: string }> = {
  green: {
    dot: "bg-green-500",
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10 border-green-500/30",
  },
  yellow: {
    dot: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/30",
  },
  red: {
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
  },
};

/* ── Component ── */

export default function ResumeHealthPanel({
  resumeHtml,
  jobDescription,
  resumeText,
  companyName,
  jobTitle,
  onOptimize,
  onApplyBulletFix,
  onAcceptFabrication,
  onRevertFabrication,
  revisions,
}: ResumeHealthPanelProps) {
  const { toast } = useToast();

  // ── Cache key based on inputs ──
  const cacheKey = `${resumeHtml?.slice(0, 200) ?? ""}|${jobDescription?.slice(0, 200) ?? ""}`;
  const cacheRef = useRef<{
    key: string;
    kwResult: KeywordMatchResult | null;
    keywords: ExtractedKeyword[];
    jobFunction: string;
    formatResult: FormatComplianceResult | null;
    bullets: BulletAnalysis[];
  } | null>(null);

  const cached = cacheRef.current?.key === cacheKey ? cacheRef.current : null;

  // ── Keyword state ──
  const [kwLoading, setKwLoading] = useState(false);
  const [kwResult, setKwResult] = useState<KeywordMatchResult | null>(cached?.kwResult ?? null);
  const [keywords, setKeywords] = useState<ExtractedKeyword[]>(cached?.keywords ?? []);
  const [jobFunction, setJobFunction] = useState(cached?.jobFunction ?? "");
  const [vibeMode, setVibeMode] = useState(false);
  const [vibePrompt, setVibePrompt] = useState("");

  // ── Format state ──
  const [formatResult, setFormatResult] = useState<FormatComplianceResult | null>(cached?.formatResult ?? null);

  // ── Bullet state ──
  const [bulletLoading, setBulletLoading] = useState(false);
  const [bullets, setBullets] = useState<BulletAnalysis[]>(cached?.bullets ?? []);
  const [expandedBullet, setExpandedBullet] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [rewriting, setRewriting] = useState<number | null>(null);
  const [rewrites, setRewrites] = useState<Record<number, string>>({});
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  // ── Section collapse state ──
  const [kwOpen, setKwOpen] = useState(false);
  const [fmtOpen, setFmtOpen] = useState(false);
  const [bulletOpen, setBulletOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);

  // ── Persist results to cache when they update ──
  useEffect(() => {
    if (kwResult || formatResult || bullets.length > 0) {
      cacheRef.current = {
        key: cacheKey,
        kwResult,
        keywords,
        jobFunction,
        formatResult,
        bullets,
      };
    }
  }, [kwResult, formatResult, bullets, keywords, jobFunction, cacheKey]);

  // ── Scores ──
  const kwScore = kwResult?.matchPercent ?? null;
  const fmtScore = formatResult?.score ?? null;
  const bulletScore = bullets.length > 0
    ? Math.round((bullets.filter((b) => b.strength === "strong").length / bullets.length) * 100)
    : null;

  // ── Analysis runners ──
  const runKeywordAnalysis = useCallback(async () => {
    if (!jobDescription || jobDescription.length < 50) return;
    setKwLoading(true);
    try {
      const extraction = await extractJdKeywords(jobDescription);
      setKeywords(extraction.keywords);
      setJobFunction(extraction.job_function);
      const result = matchKeywords(extraction.keywords, resumeText || "");
      setKwResult(result);
      if (result.matchPercent < 80) setKwOpen(true);
    } catch (e: any) {
      toast({ title: "Keyword analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setKwLoading(false);
    }
  }, [jobDescription, resumeText, toast]);

  const runFormatCheck = useCallback(() => {
    if (!resumeHtml) return;
    const result = checkAtsFormatCompliance(resumeHtml);
    setFormatResult(result);
    if (result.score < 80) setFmtOpen(true);
  }, [resumeHtml]);

  const runBulletAnalysis = useCallback(async () => {
    if (!resumeHtml || !jobDescription) return;
    setBulletLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-bullets", {
        body: { resumeHtml, jobDescription },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Analysis failed");
      setBullets(data.bullets);
      const score = Math.round(
        (data.bullets.filter((b: BulletAnalysis) => b.strength === "strong").length / data.bullets.length) * 100
      );
      if (score < 80) setBulletOpen(true);
    } catch (e: any) {
      toast({ title: "Bullet analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setBulletLoading(false);
    }
  }, [resumeHtml, jobDescription, toast]);

  // Auto-trigger ONLY the instant format check on mount.
  // Keyword analysis and bullet coaching are AI calls — only run when the user
  // explicitly clicks the section's re-run (↻) button.
  useEffect(() => {
    if (cached) {
      // Restore collapse state from cached scores
      if (cached.kwResult && cached.kwResult.matchPercent < 80) setKwOpen(true);
      if (cached.formatResult && cached.formatResult.score < 80) setFmtOpen(true);
      if (cached.bullets.length > 0) {
        const bs = Math.round((cached.bullets.filter(b => b.strength === "strong").length / cached.bullets.length) * 100);
        if (bs < 80) setBulletOpen(true);
      }
    } else {
      runFormatCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rewriteBullet = useCallback(async (index: number) => {
    const bullet = bullets[index];
    const answer = userAnswers[index];
    if (!answer?.trim()) return;
    setRewriting(index);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-bullets", {
        body: { mode: "rewrite", original: bullet.original, userAnswer: answer, jobDescription },
      });
      if (error) throw new Error(error.message);
      setRewrites((prev) => ({ ...prev, [index]: data.rewrite }));
    } catch (e: any) {
      toast({ title: "Rewrite failed", description: e.message, variant: "destructive" });
    } finally {
      setRewriting(null);
    }
  }, [bullets, userAnswers, jobDescription, toast]);

  const totalWeak = bullets.filter((b) => b.strength !== "strong").length;
  const optimizedCount = accepted.size;

  /* ── Render ── */

  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-4">
        {/* ── Summary bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Resume Health</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <ScorePill label="Keywords" score={kwScore} loading={kwLoading} />
            <ScorePill label="Format" score={fmtScore} loading={false} />
            <ScorePill label="Bullets" score={bulletScore} loading={bulletLoading} />

            {/* View Changes button */}
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1.5"
              onClick={() => setDiffOpen(!diffOpen)}
            >
              <GitCompare className="h-3.5 w-3.5" />
              View Changes
            </Button>
          </div>
        </div>

        {/* ── Diff Viewer (collapsible) ── */}
        {diffOpen && (
          <div className="pt-2 border-t border-border">
            <ResumeDiffViewer
              baselineText={resumeText}
              tailoredHtml={resumeHtml}
              jobDescription={jobDescription}
              revisions={revisions}
              onAcceptFabrication={onAcceptFabrication}
              onRevertFabrication={onRevertFabrication}
            />
          </div>
        )}

        {/* ── Keywords Section ── */}
        <HealthSection
          icon={<Target className="h-4 w-4" />}
          title="Keyword Match"
          score={kwScore}
          loading={kwLoading}
          open={kwOpen}
          onOpenChange={setKwOpen}
          onRerun={runKeywordAnalysis}
        >
          {!resumeText && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              No resume text found. Upload a resume in your Profile to see keyword match analysis.
            </div>
          )}

          {jobFunction && (
            <Badge variant="secondary" className="capitalize mb-2">
              {jobFunction.replace("_", " ")}
            </Badge>
          )}

          {kwResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  ✅ Matched ({kwResult.matched.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  <TooltipProvider>
                    {kwResult.matched.map((kw, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300 text-xs">
                            {kw.keyword}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          <p className="font-medium capitalize">{kw.category.replace("_", " ")} · {kw.importance.replace("_", " ")}</p>
                          <p className="text-muted-foreground mt-1">"{kw.context}"</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                  {kwResult.matched.length === 0 && <span className="text-xs text-muted-foreground">No keywords matched yet</span>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  ❌ Missing ({kwResult.missing.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  <TooltipProvider>
                    {kwResult.missing.map((kw, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={kw.importance === "critical" ? "destructive" : "outline"}
                            className={kw.importance !== "critical" ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs" : "text-xs"}
                          >
                            {kw.keyword}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          <p className="font-medium capitalize">{kw.category.replace("_", " ")} · {kw.importance.replace("_", " ")}</p>
                          <p className="text-muted-foreground mt-1">"{kw.context}"</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                  {kwResult.missing.length === 0 && <span className="text-xs text-muted-foreground">All keywords matched! 🎉</span>}
                </div>
              </div>
            </div>
          )}

          {kwResult && kwResult.suggestions.length > 0 && (
            <div className="space-y-1.5 mt-3">
              {kwResult.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-yellow-500" />
                  {s}
                </div>
              ))}
            </div>
          )}

          {kwResult && kwResult.missing.length > 0 && onOptimize && (
            <div className="space-y-3 pt-3 border-t border-border mt-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onOptimize(kwResult.missing)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Optimize Resume
                </Button>
                <Button size="sm" variant="outline" onClick={() => setVibeMode(!vibeMode)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Vibe-Inject
                </Button>
              </div>
              {vibeMode && (
                <div className="space-y-2">
                  <Textarea
                    placeholder='Tell the AI how to use these keywords, e.g. "I used Kubernetes in my last two DevOps roles…"'
                    value={vibePrompt}
                    onChange={(e) => setVibePrompt(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      onOptimize(kwResult.missing, vibePrompt);
                      setVibeMode(false);
                      setVibePrompt("");
                    }}
                    disabled={!vibePrompt.trim()}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Generate with Context
                  </Button>
                </div>
              )}
            </div>
          )}
        </HealthSection>

        {/* ── Format Section ── */}
        <HealthSection
          icon={<ShieldCheck className="h-4 w-4" />}
          title="ATS Format"
          score={fmtScore}
          loading={false}
          open={fmtOpen}
          onOpenChange={setFmtOpen}
          onRerun={runFormatCheck}
        >
          {formatResult && (
            <div className="space-y-2">
              {formatResult.checks.map((check, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-2 rounded text-sm ${check.passed ? "bg-muted/30" : "bg-destructive/5"}`}
                >
                  {check.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : check.severity === "error" ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : check.severity === "warning" ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${check.passed ? "text-muted-foreground" : ""}`}>
                        {check.name}
                      </span>
                      {!check.passed && (
                        <Badge variant={check.severity === "error" ? "destructive" : "outline"} className="text-[10px]">
                          {check.severity}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                    {!check.passed && check.fix && (
                      <p className="text-xs text-primary mt-1">💡 {check.fix}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </HealthSection>

        {/* ── Bullets Section ── */}
        <HealthSection
          icon={<Sparkles className="h-4 w-4" />}
          title="Bullet Quality"
          score={bulletScore}
          loading={bulletLoading}
          open={bulletOpen}
          onOpenChange={setBulletOpen}
          onRerun={runBulletAnalysis}
        >
          {bullets.length > 0 && totalWeak > 0 && (
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Optimization progress</span>
                <span>{optimizedCount}/{totalWeak}</span>
              </div>
              <Progress value={totalWeak > 0 ? Math.round((optimizedCount / totalWeak) * 100) : 0} className="h-2" />
            </div>
          )}

          <div className="space-y-2">
            {bullets.map((bullet, i) => {
              const isExpanded = expandedBullet === i;
              const isAccepted = accepted.has(i);
              const isSkipped = skipped.has(i);
              const rewrite = rewrites[i];

              if (isAccepted || isSkipped) {
                return (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground py-1 px-2 bg-muted/50 rounded">
                    {isAccepted ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <SkipForward className="h-3.5 w-3.5" />}
                    <span className="truncate">{bullet.original.slice(0, 80)}…</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {isAccepted ? "Applied" : "Skipped"}
                    </Badge>
                  </div>
                );
              }

              return (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <div
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => setExpandedBullet(isExpanded ? null : i)}
                  >
                    {bullet.strength === "strong" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : bullet.strength === "needs_work" ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <p className="text-sm leading-relaxed flex-1 min-w-0">{bullet.original}</p>
                    <Badge
                      variant={bullet.strength === "strong" ? "secondary" : bullet.strength === "needs_work" ? "outline" : "destructive"}
                      className="text-[10px] flex-shrink-0"
                    >
                      {bullet.strength === "strong" ? "Strong" : bullet.strength === "needs_work" ? "Needs Work" : "Weak"}
                    </Badge>
                  </div>

                  {isExpanded && bullet.strength !== "strong" && (
                    <div className="space-y-2 pt-2 border-t">
                      {bullet.issue && (
                        <p className="text-xs text-muted-foreground"><strong>Issue:</strong> {bullet.issue}</p>
                      )}
                      {bullet.question && (
                        <p className="text-xs text-primary font-medium">{bullet.question}</p>
                      )}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Your answer (e.g., 'about 30%', '$2M revenue')"
                          value={userAnswers[i] || ""}
                          onChange={(e) => setUserAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                          className="text-sm h-8"
                        />
                        <Button
                          size="sm"
                          onClick={() => rewriteBullet(i)}
                          disabled={rewriting === i || !userAnswers[i]?.trim()}
                          className="h-8"
                        >
                          {rewriting === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Rewrite"}
                        </Button>
                      </div>
                      {bullet.suggestion && !rewrite && (
                        <div className="bg-muted/50 p-2 rounded text-xs">
                          <strong>AI suggestion:</strong> {bullet.suggestion}
                        </div>
                      )}
                      {rewrite && (
                        <div className="bg-primary/5 border border-primary/20 p-2 rounded text-sm">{rewrite}</div>
                      )}
                      <div className="flex gap-2">
                        {rewrite && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs"
                            onClick={() => {
                              onApplyBulletFix?.(bullet.original, rewrite);
                              setAccepted((prev) => new Set(prev).add(i));
                            }}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Accept
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setSkipped((prev) => new Set(prev).add(i))}
                        >
                          <SkipForward className="mr-1 h-3 w-3" /> Skip
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </HealthSection>
      </CardContent>
    </Card>
  );
}

/* ── Sub-components ── */

function ScorePill({ label, score, loading }: { label: string; score: number | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{label}</span>
      </div>
    );
  }
  if (score === null) return null;
  const level = getLevel(score);
  const colors = levelColors[level];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
      <span className={`text-xs font-semibold ${colors.text}`}>{score}%</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function HealthSection({
  icon,
  title,
  score,
  loading,
  open,
  onOpenChange,
  onRerun,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  score: number | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRerun: () => void;
  children: React.ReactNode;
}) {
  const level = score !== null ? getLevel(score) : null;
  const colors = level ? levelColors[level] : null;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className={`rounded-lg border p-3 ${colors ? colors.bg : "border-border"}`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="text-muted-foreground">{icon}</span>
              <span className="text-sm font-medium">{title}</span>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              {score !== null && colors && (
                <Badge variant="outline" className={`text-xs ${colors.text}`}>
                  {score}%
                </Badge>
              )}
            </div>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onRerun(); }}>
              ↻ Re-scan
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-3 mt-3 border-t border-border/50">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
