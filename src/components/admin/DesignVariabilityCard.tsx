import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { scoreDesignVariability, getCachedVariability, type VariabilityResult } from "@/lib/api/designVariability";

interface Props {
  appId: string;
  assets: Array<{ assetName: string; html: string }>;
  branding?: any;
  cachedVariability?: any;
}

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBadge(score: number) {
  if (score >= 80) return "default" as const;
  if (score >= 40) return "secondary" as const;
  return "destructive" as const;
}

export default function DesignVariabilityCard({ appId, assets, branding, cachedVariability }: Props) {
  const [result, setResult] = useState<VariabilityResult | null>(getCachedVariability({ design_variability: cachedVariability }));
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const r = await scoreDesignVariability(appId, assets, branding);
      setResult(r);
      setOpen(true);
    } catch (e: any) {
      console.error("Variability scoring failed:", e);
    } finally {
      setLoading(false);
    }
  };

  if (assets.length < 2) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                <BarChart3 className="h-4 w-4" />
                <CardTitle className="text-base">Design Variability</CardTitle>
                {result && (
                  <Badge variant={scoreBadge(result.overallScore)} className="ml-1">
                    {result.overallScore}%
                  </Badge>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {result ? "Re-analyze" : "Analyze"}
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          {result && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${scoreColor(result.overallScore)}`}>{result.overallScore}%</div>
                  <div className="text-xs text-muted-foreground">Layout</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${scoreColor(result.brandingScore)}`}>{result.brandingScore}%</div>
                  <div className="text-xs text-muted-foreground">Branding</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${scoreColor(result.storytellingScore)}`}>{result.storytellingScore}%</div>
                  <div className="text-xs text-muted-foreground">Storytelling</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${scoreColor(result.styleScore)}`}>{result.styleScore}%</div>
                  <div className="text-xs text-muted-foreground">Style</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${scoreColor(result.interactivityScore)}`}>{result.interactivityScore}%</div>
                  <div className="text-xs text-muted-foreground">Interactivity</div>
                </div>
              </div>

              {result.pairwiseScores.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Pairwise Similarity</h4>
                  <div className="space-y-1">
                    {result.pairwiseScores.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">{p.asset1} ↔ {p.asset2}</span>
                        <Badge variant={scoreBadge(100 - p.similarity)} className="ml-2">
                          {p.similarity}% similar
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.contentFlowPatterns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Content Flow & Layout</h4>
                  <div className="space-y-1">
                    {result.contentFlowPatterns.map((p, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium">{p.assetName}</span>
                        <Badge variant="outline" className="ml-1 text-[10px]">{p.layoutType}</Badge>
                        <div className="text-muted-foreground mt-0.5">{p.flowPattern}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.narrativePatterns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Narrative Angles</h4>
                  <div className="space-y-1">
                    {result.narrativePatterns.map((p, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium">{p.assetName}:</span>{" "}
                        <span className="text-muted-foreground">{p.narrativeAngle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.structuralPatterns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Layout Patterns</h4>
                  <div className="space-y-1">
                    {result.structuralPatterns.map((p, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium">{p.assetName}:</span>{" "}
                        <span className="text-muted-foreground">{p.dominantPattern}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
