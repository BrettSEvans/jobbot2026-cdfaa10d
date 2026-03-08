/**
 * Resume Health Dashboard — multi-section ATS analysis card.
 * Collapsed by default showing compact score pill + delta; expandable to full dashboard.
 */
import { useState } from "react";
import { Check, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  RefreshCw, Loader2, ChevronDown, Zap,
  CheckCircle2, AlertTriangle, XCircle,
  TrendingUp, TrendingDown, FileSearch, Repeat2, Shield, BarChart3,
} from "lucide-react";
import type { AtsScoreResult } from "@/lib/api/atsScore";

interface AtsScoreCardProps {
  score: AtsScoreResult | null;
  loading: boolean;
  onRescan: () => void;
  onApplyFix?: (originalText: string, newText: string) => Promise<boolean>;
  disabled?: boolean;
}

type DashboardSection = "ats" | "impact" | "repetition" | "format";

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 30) return "Partial";
  return "Low";
}

/* ── Delta Badge ── */
function DeltaBadge({ score, baseline }: { score: number; baseline?: number }) {
  if (baseline == null) return null;
  const delta = score - baseline;
  if (delta === 0) return <span className="text-[11px] text-muted-foreground">— vs base</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${delta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
      {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {delta > 0 ? "+" : ""}{delta}
    </span>
  );
}

/* ── Mini progress bar ── */
function MiniBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${getScoreBg(value)}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ── Section: ATS Match ── */
function AtsMatchSection({ score }: { score: AtsScoreResult }) {
  return (
    <div className="space-y-3">
      {score.matchedKeywords.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" /> Matched
          </p>
          <div className="flex flex-wrap gap-1">
            {score.matchedKeywords.map((kw) => (
              <Badge key={kw} variant="default" className="text-[11px] px-1.5 py-0">{kw}</Badge>
            ))}
          </div>
        </div>
      )}
      {score.missingKeywords.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500" /> Missing
          </p>
          <div className="flex flex-wrap gap-1">
            {score.missingKeywords.map((kw) => (
              <Badge key={kw} variant="destructive" className="text-[11px] px-1.5 py-0">{kw}</Badge>
            ))}
          </div>
        </div>
      )}
      {score.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Tips</p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            {score.suggestions.map((s, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-primary shrink-0">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Section: Impact Analysis ── */
function ImpactSection({ score, onApplyFix }: { score: AtsScoreResult; onApplyFix?: (orig: string, fix: string) => Promise<boolean> }) {
  const [appliedIndices, setAppliedIndices] = useState<Set<number>>(new Set());
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);

  const { impactAnalysis } = score;
  if (!impactAnalysis) return <p className="text-xs text-muted-foreground">No impact data available.</p>;
  const total = impactAnalysis.strongBullets + impactAnalysis.weakBullets;
  const pct = total > 0 ? Math.round((impactAnalysis.strongBullets / total) * 100) : 0;

  const handleApply = async (index: number, originalText: string, suggestion: string) => {
    if (!onApplyFix || appliedIndices.has(index)) return;
    setApplyingIndex(index);
    try {
      const success = await onApplyFix(originalText, suggestion);
      if (success) {
        setAppliedIndices((prev) => new Set(prev).add(index));
        toast.success("Resume updated with improved bullet point");
      }
    } finally {
      setApplyingIndex(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border p-2">
          <p className="text-base font-bold text-green-600 dark:text-green-400">{impactAnalysis.strongBullets}</p>
          <p className="text-[10px] text-muted-foreground">Strong</p>
        </div>
        <div className="rounded-lg border p-2">
          <p className="text-base font-bold text-red-600 dark:text-red-400">{impactAnalysis.weakBullets}</p>
          <p className="text-[10px] text-muted-foreground">Weak</p>
        </div>
        <div className="rounded-lg border p-2">
          <p className="text-base font-bold text-foreground">{pct}%</p>
          <p className="text-[10px] text-muted-foreground">Impact</p>
        </div>
      </div>
      {impactAnalysis.weakExamples?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" /> Bullets to Improve
          </p>
          {impactAnalysis.weakExamples.map((ex, i) => {
            const isApplied = appliedIndices.has(i);
            const isApplying = applyingIndex === i;
            return (
              <div key={i} className={`rounded-lg border p-2.5 space-y-1.5 ${isApplied ? "border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20" : "border-border"}`}>
                <p className="text-xs text-muted-foreground line-through">{ex.text}</p>
                <p className="text-xs text-foreground font-medium">→ {ex.suggestion}</p>
                {onApplyFix && (
                  <div className="flex justify-end pt-0.5">
                    {isApplied ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                        <Check className="h-3 w-3" /> Applied
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] px-2 gap-1"
                        disabled={isApplying}
                        onClick={() => handleApply(i, ex.text, ex.suggestion)}
                      >
                        {isApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                        Apply Fix
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Section: Repetition Audit ── */
function RepetitionSection({ score }: { score: AtsScoreResult }) {
  const words = score.repetitionAudit?.overusedWords || [];
  if (words.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        No overused verbs detected. Nice variety!
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {words.map((w) => (
        <div key={w.word} className="rounded-lg border p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">"{w.word}"</span>
            <Badge variant="outline" className="text-[11px] text-yellow-600 dark:text-yellow-400">×{w.count}</Badge>
          </div>
          <div className="flex flex-wrap gap-1">
            {w.synonyms.map((syn) => (
              <Badge key={syn} variant="secondary" className="text-[11px]">{syn}</Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Section: Formatting & Professionalism ── */
function FormatSection({ score }: { score: AtsScoreResult }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">Section Parse Rate</span>
          <span className={`text-sm font-bold ${getScoreColor(score.parseRate || 0)}`}>{score.parseRate ?? 0}%</span>
        </div>
        <MiniBar value={score.parseRate || 0} />
      </div>
      {(score.parsedSections?.length > 0 || score.missingSections?.length > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {score.parsedSections?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Found</p>
              {score.parsedSections.map((s) => (
                <div key={s} className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" /> {s}
                </div>
              ))}
            </div>
          )}
          {score.missingSections?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Missing</p>
              {score.missingSections.map((s) => (
                <div key={s} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <XCircle className="h-3 w-3" /> {s}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {score.professionalismFlags?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Issues</p>
          <ul className="space-y-1">
            {score.professionalismFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(!score.professionalismFlags || score.professionalismFlags.length === 0) && (
        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" /> No professionalism issues found.
        </div>
      )}
    </div>
  );
}

/* ── Section nav items ── */
const SECTIONS: { id: DashboardSection; label: string; icon: typeof FileSearch }[] = [
  { id: "ats", label: "ATS Match", icon: FileSearch },
  { id: "impact", label: "Impact", icon: BarChart3 },
  { id: "repetition", label: "Repetition", icon: Repeat2 },
  { id: "format", label: "Format", icon: Shield },
];

/* ══════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════ */
export default function AtsScoreCard({ score, loading, onRescan, onApplyFix, disabled }: AtsScoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<DashboardSection>("ats");

  /* ── No score yet: compact scan CTA ── */
  if (!score && !loading) {
    return (
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Resume Health</p>
              <p className="text-xs text-muted-foreground">Analyze your resume against the job description</p>
            </div>
            <Button size="sm" onClick={onRescan} disabled={disabled} className="gap-1.5 shrink-0">
              <Zap className="h-3.5 w-3.5" /> Scan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Collapsed header: compact score pill ── */
  return (
    <Card className="overflow-hidden">
      <CardContent className="py-2.5 px-3">
        <div className="flex items-center gap-3">
          {/* Score pill */}
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          ) : score ? (
            <div className={`flex items-center gap-1.5 shrink-0 ${getScoreColor(score.score)}`}>
              <span className="text-lg font-bold leading-none">{score.score}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider">{getScoreLabel(score.score)}</span>
            </div>
          ) : null}

          {/* Progress bar */}
          {score && !loading && (
            <div className="flex-1 min-w-0">
              <MiniBar value={score.score} />
            </div>
          )}

          {/* Delta */}
          {score && !loading && <DeltaBadge score={score.score} baseline={score._baselineScore} />}

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0 ml-auto">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRescan} disabled={loading || disabled}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
            {score && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((prev) => !prev)}>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* ── Expanded Dashboard ── */}
      {expanded && score && (
        <div className="border-t animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Horizontal pill tabs (mobile-first), sidebar on sm+ */}
          <div className="flex flex-col sm:flex-row min-h-[220px]">
            {/* Nav — horizontal on mobile, vertical sidebar on sm+ */}
            <div className="flex sm:flex-col sm:w-[120px] shrink-0 border-b sm:border-b-0 sm:border-r bg-muted/30 p-1 sm:p-1.5 gap-0.5 overflow-x-auto">
              {SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    activeSection === sec.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <sec.icon className="h-3.5 w-3.5 shrink-0" />
                  {sec.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 p-3 overflow-y-auto max-h-[360px]">
              {activeSection === "ats" && <AtsMatchSection score={score} />}
              {activeSection === "impact" && <ImpactSection score={score} onApplyFix={onApplyFix} />}
              {activeSection === "repetition" && <RepetitionSection score={score} />}
              {activeSection === "format" && <FormatSection score={score} />}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
