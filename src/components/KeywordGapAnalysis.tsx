import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { extractJdKeywords } from "@/lib/api/keywordExtraction";
import { matchKeywords, type ExtractedKeyword, type KeywordMatchResult } from "@/lib/keywordMatcher";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";

interface KeywordGapAnalysisProps {
  jobDescription: string;
  resumeText: string | null;
  onOptimize?: (missingKeywords: ExtractedKeyword[], userPrompt?: string) => void;
}

export default function KeywordGapAnalysis({
  jobDescription,
  resumeText,
  onOptimize,
}: KeywordGapAnalysisProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<KeywordMatchResult | null>(null);
  const [keywords, setKeywords] = useState<ExtractedKeyword[]>([]);
  const [jobFunction, setJobFunction] = useState<string>("");
  const [vibeMode, setVibeMode] = useState(false);
  const [vibePrompt, setVibePrompt] = useState("");

  const runAnalysis = useCallback(async () => {
    if (!jobDescription || jobDescription.length < 50) {
      toast({ title: "Job description too short", description: "Need at least 50 characters to analyze.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const extraction = await extractJdKeywords(jobDescription);
      setKeywords(extraction.keywords);
      setJobFunction(extraction.job_function);
      const matchResult = matchKeywords(extraction.keywords, resumeText || "");
      setResult(matchResult);
      setExpanded(true);
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [jobDescription, resumeText, toast]);

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-green-600 dark:text-green-400";
    if (pct >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (pct: number) => {
    if (pct >= 80) return "bg-green-500";
    if (pct >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-3">
        {/* Collapsed header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">ATS Keyword Analysis</span>
            {result && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getScoreBg(result.matchPercent)}`}
                    style={{ width: `${result.matchPercent}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${getScoreColor(result.matchPercent)}`}>
                  {result.matchPercent}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!result && (
              <Button size="sm" variant="outline" onClick={runAnalysis} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                <span className="ml-1">{loading ? "Analyzing…" : "Analyze Keywords"}</span>
              </Button>
            )}
            {result && (
              <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && result && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4">
                {/* Job function badge */}
                {jobFunction && (
                  <Badge variant="secondary" className="capitalize">
                    {jobFunction.replace("_", " ")}
                  </Badge>
                )}

                {/* No resume warning */}
                {!resumeText && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    No resume text found. Upload a resume in your Profile to see keyword match analysis.
                  </div>
                )}

                {/* Two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Matched */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      ✅ Matched ({result.matched.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      <TooltipProvider>
                        {result.matched.map((kw, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300 text-xs"
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
                      {result.matched.length === 0 && (
                        <span className="text-xs text-muted-foreground">No keywords matched yet</span>
                      )}
                    </div>
                  </div>

                  {/* Missing */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      ❌ Missing ({result.missing.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      <TooltipProvider>
                        {result.missing.map((kw, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={kw.importance === "critical" ? "destructive" : "outline"}
                                className={
                                  kw.importance === "critical"
                                    ? "text-xs"
                                    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs"
                                }
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
                      {result.missing.length === 0 && (
                        <span className="text-xs text-muted-foreground">All keywords matched! 🎉</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                {result.suggestions.length > 0 && (
                  <div className="space-y-1.5">
                    {result.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-yellow-500" />
                        {s}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {result.missing.length > 0 && onOptimize && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => onOptimize(result.missing)}
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Optimize Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVibeMode(!vibeMode)}
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Vibe-Inject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={runAnalysis}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "↻ Re-scan"}
                      </Button>
                    </div>

                    <AnimatePresence>
                      {vibeMode && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2"
                        >
                          <Textarea
                            placeholder='Tell the AI how to use these keywords, e.g. "I used Kubernetes in my last two DevOps roles to manage 50+ microservices"'
                            value={vibePrompt}
                            onChange={(e) => setVibePrompt(e.target.value)}
                            rows={3}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              onOptimize(result.missing, vibePrompt);
                              setVibeMode(false);
                              setVibePrompt("");
                            }}
                            disabled={!vibePrompt.trim()}
                          >
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                            Generate with Context
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
