import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ScatterChart, Scatter, FunnelChart, Funnel,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LabelList,
} from "recharts";
import type { ChartConfig } from "@/lib/dashboard/schema";

const COLORS = [
  "hsl(36, 90%, 50%)", "hsl(234, 45%, 52%)", "hsl(160, 60%, 45%)",
  "hsl(340, 65%, 50%)", "hsl(200, 70%, 50%)", "hsl(45, 80%, 55%)",
  "hsl(280, 50%, 55%)", "hsl(15, 75%, 55%)",
];

function toChartData(config: ChartConfig) {
  return config.data.labels.map((label, i) => {
    const point: Record<string, any> = { name: label };
    config.data.datasets.forEach((ds) => {
      point[ds.label] = Array.isArray(ds.data[i]) ? (ds.data[i] as number[])[1] : ds.data[i];
    });
    return point;
  });
}

function toPieData(config: ChartConfig) {
  const ds = config.data.datasets[0];
  if (!ds) return [];
  return config.data.labels.map((label, i) => ({
    name: label,
    value: ds.data[i] as number,
  }));
}

export default function ChartBlock({ config }: { config: ChartConfig }) {
  const data = toChartData(config);
  const datasets = config.data.datasets;

  const renderChart = () => {
    switch (config.type) {
      case "bar":
      case "horizontalBar":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} layout={config.type === "horizontalBar" || config.indexAxis === "y" ? "vertical" : "horizontal"}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              {config.type === "horizontalBar" || config.indexAxis === "y" ? (
                <>
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                </>
              )}
              <Tooltip />
              <Legend />
              {datasets.map((ds, i) => (
                <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]}
                  radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {datasets.map((ds, i) => (
                <Line key={ds.label} type="monotone" dataKey={ds.label}
                  stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {datasets.map((ds, i) => (
                <Area key={ds.label} type="monotone" dataKey={ds.label}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]} fillOpacity={0.2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "doughnut":
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={toPieData(config)} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={config.type === "doughnut" ? 60 : 0}
                outerRadius={110} label>
                {toPieData(config).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case "radar":
        return (
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              {datasets.map((ds, i) => (
                <Radar key={ds.label} name={ds.label} dataKey={ds.label}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]} fillOpacity={0.2} />
              ))}
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              {datasets.map((ds, i) => (
                <Scatter key={ds.label} name={ds.label} data={data}
                  fill={COLORS[i % COLORS.length]} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "funnel":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={toPieData(config)} isAnimationActive>
                {toPieData(config).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
                <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );

      // waterfall, gantt, heatmap, treemap — render as bar fallback
      default:
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {datasets.map((ds, i) => (
                <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]}
                  radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <h4 className="text-sm font-semibold mb-3 text-card-foreground">{config.title}</h4>
      {renderChart()}
    </div>
  );
}
