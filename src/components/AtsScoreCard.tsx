/**
 * ATS Match Score card — circular gauge with keyword analysis.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RefreshCw, Loader2, ChevronDown, Target } from "lucide-react";
import type { AtsScoreResult } from "@/lib/api/atsScore";

interface AtsScoreCardProps {
  score: AtsScoreResult | null;
  loading: boolean;
  onRescan: () => void;
  disabled?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreStroke(score: number): string {
  if (score >= 80) return "stroke-green-500";
  if (score >= 50) return "stroke-yellow-500";
  return "stroke-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong Match";
  if (score >= 60) return "Good Match";
  if (score >= 30) return "Partial Match";
  return "Low Match";
}

export default function AtsScoreCard({ score, loading, onRescan, disabled }: AtsScoreCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!score && !loading) return null;

  const circumference = 2 * Math.PI * 40;
  const dashOffset = score ? circumference - (score.score / 100) * circumference : circumference;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className="overflow-hidden">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-4">
            {/* Circular gauge */}
            <div className="relative h-16 w-16 shrink-0">
              {loading ? (
                <div className="flex items-center justify-center h-full w-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : score ? (
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" strokeWidth="8"
                    strokeLinecap="round"
                    className={getScoreStroke(score.score)}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                </svg>
              ) : null}
              {score && !loading && (
                <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getScoreColor(score.score)}`}>
                  {score.score}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">ATS Match Score</span>
                {score && (
                  <Badge variant="outline" className="text-xs">
                    {getScoreLabel(score.score)}
                  </Badge>
                )}
              </div>
              {score && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {score.matchedKeywords.length} matched · {score.missingKeywords.length} missing
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onRescan} disabled={loading || disabled}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
              {score && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>
        </CardContent>

        <CollapsibleContent>
          {score && (
            <div className="border-t px-4 py-3 space-y-3">
              {/* Matched Keywords */}
              {score.matchedKeywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Matched Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {score.matchedKeywords.map((kw) => (
                      <Badge key={kw} variant="default" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Keywords */}
              {score.missingKeywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Missing Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {score.missingKeywords.map((kw) => (
                      <Badge key={kw} variant="destructive" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {score.suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Suggestions</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {score.suggestions.map((s, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-primary">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
