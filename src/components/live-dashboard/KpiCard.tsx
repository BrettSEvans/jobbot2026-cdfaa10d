import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MetricItem } from "@/lib/dashboard/schema";

const NEU_SHADOW = "9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)";
const NEU_SHADOW_HOVER = "12px 12px 20px rgb(163,177,198,0.7), -12px -12px 20px rgba(255,255,255,0.6)";

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
        className="col-span-2 rounded-[32px] p-6 relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-0.5"
        style={{
          background: "var(--dash-surface, #E0E5EC)",
          boxShadow: NEU_SHADOW,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = NEU_SHADOW_HOVER; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = NEU_SHADOW; }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] rounded-[32px]"
          style={{
            background: "linear-gradient(135deg, var(--dash-primary, #0a8080), var(--dash-primary-container, #0a8080))",
          }}
        />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--dash-on-surface, #6B7280)" }}>{metric.label}</p>
          <p className="text-4xl font-extrabold mt-2 tracking-tight" style={{ color: "var(--dash-on-surface, #3D4852)", fontFamily: "var(--dash-font-heading, 'Plus Jakarta Sans', sans-serif)" }}>
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
      className="rounded-[32px] p-4 transition-all duration-300 ease-out hover:-translate-y-0.5"
      style={{
        background: "var(--dash-surface, #E0E5EC)",
        boxShadow: NEU_SHADOW,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = NEU_SHADOW_HOVER; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = NEU_SHADOW; }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--dash-on-surface, #6B7280)" }}>{metric.label}</p>
      <p className="text-2xl font-bold mt-1 tracking-tight" style={{ color: "var(--dash-on-surface, #3D4852)", fontFamily: "var(--dash-font-heading, 'Plus Jakarta Sans', sans-serif)" }}>{metric.value}</p>
      {metric.change && (
        <div className="flex items-center gap-1 mt-1" style={{ color: trendColor }}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{metric.change}</span>
        </div>
      )}
    </div>
  );
}
