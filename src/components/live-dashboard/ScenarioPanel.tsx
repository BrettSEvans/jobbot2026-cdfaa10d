import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { CFOScenario } from "@/lib/dashboard/schema";

const COLORS = ["hsl(36, 90%, 50%)", "hsl(234, 45%, 52%)", "hsl(160, 60%, 45%)"];
const NEU_SHADOW = "9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)";
const NEU_SHADOW_HOVER = "12px 12px 20px rgb(163,177,198,0.7), -12px -12px 20px rgba(255,255,255,0.6)";
const NEU_SHADOW_SM = "5px 5px 10px rgb(163,177,198,0.6), -5px -5px 10px rgba(255,255,255,0.5)";
const NEU_SHADOW_INSET = "inset 6px 6px 10px rgb(163,177,198,0.6), inset -6px -6px 10px rgba(255,255,255,0.5)";

function formatVal(v: number, currency?: boolean) {
  if (!currency) return v.toLocaleString();
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default function ScenarioPanel({ scenario }: { scenario: CFOScenario }) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    scenario.sliders.forEach((s) => { init[s.id] = s.default; });
    return init;
  });

  const chartData = useMemo(() => {
    return (scenario.quarters || []).map((q, i) => {
      const point: Record<string, any> = { name: q };
      Object.entries(scenario.baseline).forEach(([key, baseVal]) => {
        let adjusted = baseVal;
        scenario.sliders.forEach((sl) => {
          const ratio = values[sl.id] / sl.default;
          adjusted = adjusted * (0.5 + 0.5 * ratio);
        });
        point[key] = Math.round(adjusted * (1 + i * 0.05));
      });
      return point;
    });
  }, [values, scenario]);

  const baselineKeys = Object.keys(scenario.baseline);

  return (
    <div
      className="rounded-[32px] p-6 transition-all duration-300 ease-out hover:-translate-y-0.5"
      style={{
        background: "var(--dash-surface, #E0E5EC)",
        boxShadow: NEU_SHADOW,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = NEU_SHADOW_HOVER; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = NEU_SHADOW; }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold tracking-tight" style={{ color: "var(--dash-on-surface, #3D4852)", fontFamily: "var(--dash-font-heading, 'Plus Jakarta Sans', sans-serif)" }}>
            {scenario.title}
          </h3>
          <span
            className="text-xs font-medium px-2.5 py-0.5 rounded-2xl"
            style={{ background: "var(--dash-surface, #E0E5EC)", color: "var(--dash-on-surface, #6B7280)", boxShadow: NEU_SHADOW_SM }}
          >
            {scenario.type}
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--dash-on-surface, #6B7280)" }}>{scenario.description}</p>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {scenario.sliders.map((sl) => {
          if (sl.controlType === "toggle") {
            return (
              <div key={sl.id} className="space-y-1">
                <label className="text-sm font-medium" style={{ color: "var(--dash-on-surface, #3D4852)" }}>{sl.label}</label>
                <div className="flex gap-2">
                  {(sl.options || [{ label: "Off", value: sl.min }, { label: "On", value: sl.max }]).map((opt) => (
                    <button key={opt.value}
                      className="px-3 py-1 rounded-2xl text-xs font-medium transition-all duration-300"
                      style={{
                        background: values[sl.id] === opt.value ? "var(--dash-primary, #0a8080)" : "var(--dash-surface, #E0E5EC)",
                        color: values[sl.id] === opt.value ? "var(--dash-on-primary, #fff)" : "var(--dash-on-surface, #3D4852)",
                        boxShadow: values[sl.id] === opt.value ? NEU_SHADOW_SM : NEU_SHADOW_INSET,
                      }}
                      onClick={() => setValues((p) => ({ ...p, [sl.id]: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          }

          if (sl.controlType === "segmented") {
            return (
              <div key={sl.id} className="space-y-1">
                <label className="text-sm font-medium" style={{ color: "var(--dash-on-surface, #3D4852)" }}>{sl.label}</label>
                <div className="flex gap-1 rounded-2xl p-0.5" style={{ boxShadow: NEU_SHADOW_INSET, background: "var(--dash-surface, #E0E5EC)" }}>
                  {(sl.options || []).map((opt) => (
                    <button key={opt.value}
                      className="flex-1 px-2 py-1 rounded-xl text-xs font-medium transition-all duration-300"
                      style={{
                        background: values[sl.id] === opt.value ? "var(--dash-primary, #0a8080)" : "transparent",
                        color: values[sl.id] === opt.value ? "var(--dash-on-primary, #fff)" : "var(--dash-on-surface, #6B7280)",
                        boxShadow: values[sl.id] === opt.value ? NEU_SHADOW_SM : "none",
                      }}
                      onClick={() => setValues((p) => ({ ...p, [sl.id]: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={sl.id} className="space-y-1">
              <div className="flex justify-between">
                <label className="text-sm font-medium" style={{ color: "var(--dash-on-surface, #3D4852)" }}>{sl.label}</label>
                <span className="text-sm" style={{ color: "var(--dash-on-surface, #6B7280)" }}>
                  {values[sl.id]}{sl.unit}
                </span>
              </div>
              <Slider
                min={sl.min} max={sl.max} step={sl.step}
                value={[values[sl.id]]}
                onValueChange={([v]) => setValues((p) => ({ ...p, [sl.id]: v }))}
              />
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-3" style={{ boxShadow: NEU_SHADOW_INSET, background: "var(--dash-surface, #E0E5EC)" }}>
        <ResponsiveContainer width="100%" height={280}>
          {scenario.chartType === "bar" ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => formatVal(v, scenario.currencyFormat)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatVal(v, scenario.currencyFormat)} />
              <Legend />
              {baselineKeys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => formatVal(v, scenario.currencyFormat)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatVal(v, scenario.currencyFormat)} />
              <Legend />
              {baselineKeys.map((k, i) => (
                <Line key={k} type="monotone" dataKey={k}
                  stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
