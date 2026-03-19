import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { parseJobDescription } from "@/lib/api/jdIntelligence";
import type { JDIntelligence } from "@/lib/api/jdIntelligence";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Brain,
  AlertTriangle,
  Shield,
  Target,
  Users,
  TrendingUp,
  Briefcase,
  Heart,
  Flag,
} from "lucide-react";

interface JDIntelligencePanelProps {
  jobDescription: string;
  companyName?: string;
  jdIntelligence?: JDIntelligence | null;
  onParsed?: (intelligence: JDIntelligence) => void;
}

export default function JDIntelligencePanel({
  jobDescription,
  companyName,
  jdIntelligence: initialData,
  onParsed,
}: JDIntelligencePanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<JDIntelligence | null>(initialData ?? null);

  const runParse = useCallback(async () => {
    if (!jobDescription || jobDescription.length < 50) {
      toast({ title: "Job description too short", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await parseJobDescription({ jobDescriptionMarkdown: jobDescription, companyName });
      setData(result);
      setExpanded(true);
      onParsed?.(result);
      toast({ title: "JD Intelligence parsed" });
    } catch (e: any) {
      toast({ title: "Parse failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [jobDescription, companyName, onParsed, toast]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case "must_have": return "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300";
      case "preferred": return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
      case "bonus": return "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300";
      default: return "";
    }
  };

  const getSeverityClass = (sev: string) => {
    switch (sev) {
      case "critical": return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40";
      case "high": return "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40";
      case "medium": return "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getRouteIcon = (route: string) => {
    switch (route) {
      case "cover_letter": return <Heart className="h-3 w-3" />;
      case "interview_prep": return <Users className="h-3 w-3" />;
      case "red_flag": return <Flag className="h-3 w-3" />;
      default: return null;
    }
  };

  const mustHave = data?.requirements.filter(r => r.category === "must_have") || [];
  const preferred = data?.requirements.filter(r => r.category === "preferred") || [];
  const bonus = data?.requirements.filter(r => r.category === "bonus") || [];

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">JD Intelligence</span>
            {data && (
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getHealthBg(data.red_flag_score.score)}`}
                    style={{ width: `${data.red_flag_score.score}%` }}
                  />
                </div>
                <span className={`text-xs font-bold ${getHealthColor(data.red_flag_score.score)}`}>
                  {data.red_flag_score.score}/100
                </span>
                <span className="text-xs text-muted-foreground">
                  • {mustHave.length} required • {data.red_flag_score.total_flags} flags
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!data && (
              <Button size="sm" variant="outline" onClick={runParse} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                <span className="ml-1">{loading ? "Parsing…" : "Parse JD"}</span>
              </Button>
            )}
            {data && (
              <>
                <Button size="sm" variant="ghost" onClick={runParse} disabled={loading}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "↻"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && data && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4">
                {/* Summary + function */}
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="capitalize shrink-0">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {data.job_function}
                  </Badge>
                  {data.department && (
                    <Badge variant="outline" className="shrink-0">{data.department}</Badge>
                  )}
                  <p className="text-xs text-muted-foreground">{data.summary}</p>
                </div>

                {/* Red flag alerts */}
                {data.red_flag_score.top_alerts.length > 0 && (
                  <div className="space-y-1.5">
                    {data.red_flag_score.top_alerts.map((alert, i) => (
                      <div key={i} className={`flex items-start gap-2 p-2 rounded-md border text-xs ${getSeverityClass(alert.severity)}`}>
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">{alert.text}</span>
                          <p className="text-muted-foreground mt-0.5">{alert.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Seniority */}
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="capitalize">{data.seniority.level}</Badge>
                      <Badge variant="outline" className="capitalize">{data.seniority.management_scope.replace("_", " ")}</Badge>
                      {data.seniority.years_min != null && (
                        <span className="text-xs text-muted-foreground">
                          {data.seniority.years_min}{data.seniority.years_max ? `–${data.seniority.years_max}` : "+"} years
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={data.seniority.confidence * 100} className="h-1.5 w-20" />
                      <span className="text-xs text-muted-foreground">{Math.round(data.seniority.confidence * 100)}% confidence</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{data.seniority.reasoning}</p>
                  </div>
                </div>

                {/* Requirements */}
                <Tabs defaultValue="must_have" className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="must_have" className="text-xs">Must-Have ({mustHave.length})</TabsTrigger>
                    <TabsTrigger value="preferred" className="text-xs">Preferred ({preferred.length})</TabsTrigger>
                    <TabsTrigger value="bonus" className="text-xs">Bonus ({bonus.length})</TabsTrigger>
                  </TabsList>
                  {(["must_have", "preferred", "bonus"] as const).map(cat => (
                    <TabsContent key={cat} value={cat} className="mt-2">
                      <div className="flex flex-wrap gap-1.5">
                        <TooltipProvider>
                          {(cat === "must_have" ? mustHave : cat === "preferred" ? preferred : bonus).map((req, i) => (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className={`text-xs ${getCategoryBadgeClass(cat)}`}>
                                  {req.text.length > 40 ? req.text.slice(0, 40) + "…" : req.text}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                <p>{req.text}</p>
                                <p className="text-muted-foreground capitalize mt-1">{req.skill_type.replace("_", " ")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                {/* ATS Keywords */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    ATS Keywords ({data.ats_keywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    <TooltipProvider>
                      {data.ats_keywords.map((kw, i) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={kw.tier === 1 ? "default" : "outline"}
                              className={`${kw.tier === 1 ? "text-xs font-semibold" : kw.tier === 2 ? "text-xs" : "text-[11px] text-muted-foreground"}`}
                            >
                              {kw.keyword}
                              {kw.is_in_title && " ★"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Tier {kw.tier} • {kw.frequency}x mentioned{kw.is_in_title ? " • In title" : ""}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                </div>

                {/* Culture Signals */}
                {data.culture_signals.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      Culture Signals ({data.culture_signals.length})
                    </h4>
                    <div className="space-y-1">
                      {data.culture_signals.map((sig, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {getRouteIcon(sig.route_to)}
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {sig.signal_type.replace("_", " ")}
                          </Badge>
                          <span className="text-muted-foreground">{sig.text}</span>
                        </div>
                      ))}
                    </div>
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
