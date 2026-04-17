import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MetricItem } from "@/lib/dashboard/schema";

interface KpiCardProps {
  metric: MetricItem;
  spotlight?: boolean;
}

export default function KpiCard({ metric, spotlight }: KpiCardProps) {
  const TrendIcon = metric.trend === "up" ? TrendingUp
    : metric.trend === "down" ? TrendingDown : Minus;
  const trendColor = metric.trend === "up" ? "#10B981"
    : metric.trend === "down" ? "#EF4444" : "#6B7280";

  if (spotlight) {
    return (
      <div
        className="col-span-2 p-6 relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-0.5"
        style={{
          background: "var(--dash-surface, #E0E5EC)",
          boxShadow: "var(--dash-card-shadow, none)",
          border: "var(--dash-card-border, none)",
          borderRadius: "var(--dash-radius, 32px)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--dash-card-shadow-hover, var(--dash-card-shadow, none))"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--dash-card-shadow, none)"; }}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            background: "linear-gradient(135deg, var(--dash-primary, #0a8080), var(--dash-primary-container, #0a8080))",
            borderRadius: "var(--dash-radius, 32px)",
          }}
        />
        <div className="relative">
          <p
            className="text-xs font-medium"
            style={{
              color: "var(--dash-on-surface-muted, #6B7280)",
              textTransform: "var(--dash-label-transform, uppercase)" as any,
              letterSpacing: "var(--dash-label-tracking, 0.05em)",
            }}
          >
            {metric.label}
          </p>
          <p
            className="text-4xl font-extrabold mt-2 tracking-tight"
            style={{
              color: "var(--dash-on-surface, #3D4852)",
              fontFamily: "var(--dash-font-heading, 'Plus Jakarta Sans', sans-serif)",
              fontVariantNumeric: "tabular-nums",
              fontFeatureSettings: "'tnum'",
            }}
          >
            {metric.value}
          </p>
          {metric.change && (
            <div className="flex items-center gap-1.5 mt-2" style={{ color: trendColor }}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-sm font-semibold">{metric.change}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-4 transition-all duration-300 ease-out hover:-translate-y-0.5"
      style={{
        background: "var(--dash-surface, #E0E5EC)",
        boxShadow: "var(--dash-card-shadow, none)",
        border: "var(--dash-card-border, none)",
        borderRadius: "var(--dash-radius, 32px)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--dash-card-shadow-hover, var(--dash-card-shadow, none))"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--dash-card-shadow, none)"; }}
    >
      <p
        className="text-xs font-medium"
        style={{
          color: "var(--dash-on-surface-muted, #6B7280)",
          textTransform: "var(--dash-label-transform, uppercase)" as any,
          letterSpacing: "var(--dash-label-tracking, 0.05em)",
        }}
      >
        {metric.label}
      </p>
      <p
        className="text-2xl font-bold mt-1 tracking-tight"
        style={{
          color: "var(--dash-on-surface, #3D4852)",
          fontFamily: "var(--dash-font-heading, 'Plus Jakarta Sans', sans-serif)",
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: "'tnum'",
        }}
      >
        {metric.value}
      </p>
      {metric.change && (
        <div className="flex items-center gap-1 mt-1" style={{ color: trendColor }}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{metric.change}</span>
        </div>
      )}
    </div>
  );
}
