import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MetricItem } from "@/lib/dashboard/schema";

export default function KpiCard({ metric }: { metric: MetricItem }) {
  const TrendIcon = metric.trend === "up" ? TrendingUp
    : metric.trend === "down" ? TrendingDown : Minus;
  const trendColor = metric.trend === "up" ? "text-emerald-500"
    : metric.trend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{metric.label}</p>
        <p className="text-2xl font-bold mt-1 text-card-foreground">{metric.value}</p>
        {metric.change && (
          <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{metric.change}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
