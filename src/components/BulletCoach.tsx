import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  SkipForward,
} from "lucide-react";

interface BulletAnalysis {
  original: string;
  strength: "strong" | "needs_work" | "weak";
  issue?: string;
  question?: string;
  suggestion?: string;
}

interface BulletCoachProps {
  resumeHtml: string;
  jobDescription: string;
  onApplyFix?: (original: string, replacement: string) => void;
}

export default function BulletCoach({ resumeHtml, jobDescription, onApplyFix }: BulletCoachProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [bullets, setBullets] = useState<BulletAnalysis[]>([]);
  const [expandedBullet, setExpandedBullet] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [rewriting, setRewriting] = useState<number | null>(null);
  const [rewrites, setRewrites] = useState<Record<number, string>>({});
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  const analyzeBullets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-bullets", {
        body: { resumeHtml, jobDescription },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Analysis failed");
      setBullets(data.bullets);
      setExpanded(true);
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [resumeHtml, jobDescription, toast]);

  const rewriteBullet = useCallback(async (index: number) => {
    const bullet = bullets[index];
    const answer = userAnswers[index];
    if (!answer?.trim()) return;

    setRewriting(index);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-bullets", {
        body: {
          mode: "rewrite",
          original: bullet.original,
          userAnswer: answer,
          jobDescription,
        },
      });
      if (error) throw new Error(error.message);
      setRewrites((prev) => ({ ...prev, [index]: data.rewrite }));
    } catch (e: any) {
      toast({ title: "Rewrite failed", description: e.message, variant: "destructive" });
    } finally {
      setRewriting(null);
    }
  }, [bullets, userAnswers, jobDescription, toast]);

  const strengthIcon = (s: string) => {
    if (s === "strong") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === "needs_work") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const strengthLabel = (s: string) => {
    if (s === "strong") return "Strong";
    if (s === "needs_work") return "Needs Work";
    return "Weak";
  };

  const optimizedCount = accepted.size;
  const totalWeak = bullets.filter((b) => b.strength !== "strong").length;
  const progressPct = totalWeak > 0 ? Math.round((optimizedCount / totalWeak) * 100) : 0;

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Bullet Coaching</span>
            {bullets.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {optimizedCount} of {totalWeak} improved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {bullets.length === 0 && (
              <Button size="sm" variant="outline" onClick={analyzeBullets} disabled={loading || !resumeHtml}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="ml-1">{loading ? "Analyzing…" : "Coach My Bullets"}</span>
              </Button>
            )}
            {bullets.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && bullets.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3">
                {totalWeak > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Optimization progress</span>
                      <span>{optimizedCount}/{totalWeak}</span>
                    </div>
                    <Progress value={progressPct} className="h-2" />
                  </div>
                )}

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
                    <Card key={i} className="border">
                      <CardContent className="p-3 space-y-2">
                        <div
                          className="flex items-start gap-2 cursor-pointer"
                          onClick={() => setExpandedBullet(isExpanded ? null : i)}
                        >
                          {strengthIcon(bullet.strength)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed">{bullet.original}</p>
                          </div>
                          <Badge
                            variant={bullet.strength === "strong" ? "secondary" : bullet.strength === "needs_work" ? "outline" : "destructive"}
                            className="text-[10px] flex-shrink-0"
                          >
                            {strengthLabel(bullet.strength)}
                          </Badge>
                        </div>

                        <AnimatePresence>
                          {isExpanded && bullet.strength !== "strong" && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-2 pt-2 border-t"
                            >
                              {bullet.issue && (
                                <p className="text-xs text-muted-foreground">
                                  <strong>Issue:</strong> {bullet.issue}
                                </p>
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
                                <div className="bg-primary/5 border border-primary/20 p-2 rounded text-sm">
                                  {rewrite}
                                </div>
                              )}

                              <div className="flex gap-2">
                                {rewrite && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      onApplyFix?.(bullet.original, rewrite);
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
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
