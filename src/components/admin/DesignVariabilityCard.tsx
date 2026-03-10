import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Loader2, Sparkles, Palette, LayoutGrid, ChevronDown } from "lucide-react";
import {
  scoreDesignVariability,
  getCachedVariability,
  type DesignVariabilityResult,
} from "@/lib/api/designVariability";
import type { Json } from "@/integrations/supabase/types";

interface Props {
  appId: string;
  dynamicAssets: { id: string; asset_name: string; html: string }[];
  branding: Record<string, unknown> | null;
  cachedVariability: Json | null;
}

function scoreColor(score: number): string {
  if (score < 40) return "text-destructive";
  if (score <= 70) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function scoreBadgeVariant(score: number): "destructive" | "secondary" | "default" {
  if (score < 40) return "destructive";
  if (score <= 70) return "secondary";
  return "default";
}

export default function DesignVariabilityCard({ appId, dynamicAssets, branding, cachedVariability }: Props) {
  const cached = getCachedVariability({ design_variability: cachedVariability });
  const [result, setResult] = useState<DesignVariabilityResult | null>(cached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const assets = dynamicAssets
        .filter((a) => a.html && a.html.length > 50)
        .map((a) => ({ assetName: a.asset_name, html: a.html }));

      if (assets.length < 2) {
        setError("Need at least 2 completed assets to analyze.");
        return;
      }

      const res = await scoreDesignVariability(appId, assets, branding);
      setResult(res);
      setOpen(true);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.pairwiseScores?.map((p) => ({
    name: `${p.asset1.slice(0, 12)} vs ${p.asset2.slice(0, 12)}`,
    similarity: p.similarity,
    variety: 100 - p.similarity,
  })) || [];

  return (
    <Card className="border-dashed border-primary/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left group">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Design Variability</CardTitle>
                <Badge variant="outline" className="text-[10px] font-normal">Admin</Badge>
                {result && (
                  <span className={`text-sm font-bold ${scoreColor(result.overallScore)}`}>
                    {result.overallScore}%
                  </span>
                )}
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={loading}
              className="h-7 text-xs"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              {result ? "Re-analyze" : "Analyze Variability"}
            </Button>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {error && <p className="text-xs text-destructive">{error}</p>}

            {!result && !loading && !error && (
              <p className="text-xs text-muted-foreground">
                Run analysis to evaluate layout diversity across industry materials.
              </p>
            )}

            {result && (
              <>
                {/* Score Summary */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${scoreColor(result.overallScore)}`}>
                      {result.overallScore}%
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Variability</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={`text-lg font-semibold ${scoreColor(result.brandingScore)}`}>
                        {result.brandingScore}%
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Branding</div>
                  </div>
                  <div className="ml-auto">
                    <Badge variant={scoreBadgeVariant(result.overallScore)}>
                      {result.overallScore < 40
                        ? "Low Variety"
                        : result.overallScore <= 70
                        ? "Moderate"
                        : "Strong Variety"}
                    </Badge>
                  </div>
                </div>

                {/* Pairwise Similarity Chart */}
                {chartData.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Pairwise Similarity</h4>
                    <ResponsiveContainer width="100%" height={chartData.length * 40 + 20}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(value: number, name: string) =>
                            name === "similarity"
                              ? [`${value}% similar`, "Similarity"]
                              : [`${value}% unique`, "Variety"]
                          }
                        />
                        <Bar dataKey="similarity" stackId="a" radius={[0, 0, 0, 0]}>
                          {chartData.map((_, idx) => (
                            <Cell key={idx} fill="hsl(36, 90%, 50%)" />
                          ))}
                        </Bar>
                        <Bar dataKey="variety" stackId="a" radius={[0, 4, 4, 0]}>
                          {chartData.map((_, idx) => (
                            <Cell key={idx} fill="hsl(234, 18%, 28%)" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Structural Patterns */}
                {result.structuralPatterns?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Layout Patterns</h4>
                    <div className="space-y-1">
                      {result.structuralPatterns.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="font-medium min-w-[100px] text-foreground">{p.assetName}:</span>
                          <span className="text-muted-foreground">{p.dominantPattern}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Recommendations</h4>
                    <ul className="space-y-1">
                      {result.recommendations.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.scoredAt && (
                  <p className="text-[10px] text-muted-foreground">
                    Analyzed {new Date(result.scoredAt).toLocaleString()}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
