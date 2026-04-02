import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { CFOScenario } from "@/lib/dashboard/schema";

const COLORS = ["hsl(36, 90%, 50%)", "hsl(234, 45%, 52%)", "hsl(160, 60%, 45%)"];

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
        // Add slight quarter variation
        point[key] = Math.round(adjusted * (1 + i * 0.05));
      });
      return point;
    });
  }, [values, scenario]);

  const baselineKeys = Object.keys(scenario.baseline);
  const ChartComp = scenario.chartType === "bar" ? BarChart : LineChart;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{scenario.title}</CardTitle>
          <Badge variant="secondary" className="text-xs">{scenario.type}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{scenario.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {scenario.sliders.map((sl) => {
            if (sl.controlType === "toggle") {
              return (
                <div key={sl.id} className="space-y-1">
                  <label className="text-sm font-medium">{sl.label}</label>
                  <div className="flex gap-2">
                    {(sl.options || [{ label: "Off", value: sl.min }, { label: "On", value: sl.max }]).map((opt) => (
                      <button key={opt.value}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          values[sl.id] === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
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
                  <label className="text-sm font-medium">{sl.label}</label>
                  <div className="flex gap-1 bg-secondary rounded-md p-0.5">
                    {(sl.options || []).map((opt) => (
                      <button key={opt.value}
                        className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                          values[sl.id] === opt.value
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-secondary-foreground hover:bg-secondary/80"
                        }`}
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
                  <label className="text-sm font-medium">{sl.label}</label>
                  <span className="text-sm text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}
