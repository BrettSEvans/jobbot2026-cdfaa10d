/**
 * Pipeline Analytics — funnel bar chart showing application counts per stage
 * with conversion rates between stages.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  daysInStage,
  type PipelineStage,
} from "@/lib/pipelineStages";
import type { JobApplication } from "@/hooks/useApplicationDetail";
import { BarChart3, TrendingDown, Clock, ArrowRight, ChevronDown } from "lucide-react";

interface PipelineAnalyticsProps {
  applications: JobApplication[];
}

export default function PipelineAnalytics({ applications }: PipelineAnalyticsProps) {
  const stats = useMemo(() => {
    const counts = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s, 0])
    ) as Record<PipelineStage, number>;
    const totalDays = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s, [] as number[]])
    ) as Record<PipelineStage, number[]>;

    for (const app of applications) {
      const stage = (app.pipeline_stage || "bookmarked") as PipelineStage;
      if (counts[stage] !== undefined) {
        counts[stage]++;
        const changedAt = app.stage_changed_at || app.created_at;
        if (changedAt) totalDays[stage].push(daysInStage(changedAt));
      }
    }

    const maxCount = Math.max(1, ...Object.values(counts));

    // Conversion rates: what % of the previous "forward" stage moved to this one
    const forwardFlow: PipelineStage[] = ["bookmarked", "applied", "interviewing", "offer", "accepted"];
    const conversions: Record<string, number | null> = {};
    for (let i = 1; i < forwardFlow.length; i++) {
      const curr = forwardFlow[i];
      const reachedCurr = forwardFlow.slice(i).reduce((sum, s) => sum + counts[s], 0);
      const reachedPrev = forwardFlow.slice(i - 1).reduce((sum, s) => sum + counts[s], 0);
      conversions[curr] = reachedPrev > 0 ? Math.round((reachedCurr / reachedPrev) * 100) : null;
    }

    const avgDays = Object.fromEntries(
      PIPELINE_STAGES.map((s) => {
        const arr = totalDays[s];
        return [s, arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null];
      })
    ) as Record<PipelineStage, number | null>;

    return { counts, maxCount, conversions, avgDays };
  }, [applications]);

  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem("pipeline_analytics_open");
    return saved !== null ? saved === "true" : true;
  });

  if (applications.length === 0) return null;

  const forwardStages: PipelineStage[] = ["bookmarked", "applied", "interviewing", "offer", "accepted"];
  const terminalStages: PipelineStage[] = ["withdrawn", "ghosted", "rejected"];

  const handleToggle = (val: boolean) => {
    setOpen(val);
    localStorage.setItem("pipeline_analytics_open", String(val));
  };

  return (
    <Collapsible open={open} onOpenChange={handleToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Pipeline Analytics
              <ChevronDown className={`h-4 w-4 ml-auto text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Funnel bars */}
            <div className="space-y-2">
              {forwardStages.map((stage, i) => (
                <div key={stage}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium w-24 shrink-0 text-right">
                      {STAGE_LABELS[stage]}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                        <div
                          className={`h-full rounded-md transition-all ${STAGE_COLORS[stage].split(" ")[0]}`}
                          style={{
                            width: `${Math.max(2, (stats.counts[stage] / stats.maxCount) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{stats.counts[stage]}</span>
                    </div>
                    {stats.avgDays[stage] !== null && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 w-16 shrink-0">
                        <Clock className="h-3 w-3" /> {stats.avgDays[stage]}d avg
                      </span>
                    )}
                  </div>
                  {/* Conversion arrow */}
                  {i < forwardStages.length - 1 && stats.conversions[forwardStages[i + 1]] !== null && (
                    <div className="flex items-center gap-3 ml-24 pl-3 py-0.5">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {stats.conversions[forwardStages[i + 1]]}% conversion
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Terminal stages */}
            {terminalStages.some((s) => stats.counts[s] > 0) && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> Terminal Stages
                </p>
                <div className="flex gap-3">
                  {terminalStages.map(
                    (stage) =>
                      stats.counts[stage] > 0 && (
                        <Badge key={stage} variant="outline" className={`text-xs ${STAGE_COLORS[stage]}`}>
                          {STAGE_LABELS[stage]}: {stats.counts[stage]}
                        </Badge>
                      )
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
