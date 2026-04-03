import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MetricItem } from "@/lib/dashboard/schema";

interface KpiCardProps {
  metric: MetricItem;
  spotlight?: boolean;
}

export default function KpiCard({ metric, spotlight }: KpiCardProps) {
  const TrendIcon = metric.trend === "up" ? TrendingUp
    : metric.trend === "down" ? TrendingDown : Minus;
  const trendColor = metric.trend === "up" ? "text-emerald-500"
    : metric.trend === "down" ? "text-red-500" : "text-muted-foreground";

  if (spotlight) {
    return (
      <Card className="col-span-2 hover:shadow-lg transition-shadow relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background: "linear-gradient(135deg, var(--dash-primary, hsl(var(--primary))), var(--dash-primary-container, hsl(var(--primary))))",
          }}
        />
        <CardContent className="p-5 relative">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{metric.label}</p>
          <p className="text-4xl font-extrabold mt-2 text-card-foreground" style={{ fontFamily: "var(--dash-font-heading, inherit)" }}>
            {metric.value}
          </p>
          {metric.change && (
            <div className={`flex items-center gap-1.5 mt-2 ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-sm font-semibold">{metric.change}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

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
