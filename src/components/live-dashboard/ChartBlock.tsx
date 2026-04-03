import { useMemo, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ScatterChart, Scatter, FunnelChart, Funnel,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LabelList, Treemap,
} from "recharts";
import type { ChartConfig } from "@/lib/dashboard/schema";

const COLORS = [
  "hsl(36, 90%, 50%)", "hsl(234, 45%, 52%)", "hsl(160, 60%, 45%)",
  "hsl(340, 65%, 50%)", "hsl(200, 70%, 50%)", "hsl(45, 80%, 55%)",
  "hsl(280, 50%, 55%)", "hsl(15, 75%, 55%)",
];

export interface DrillFilter {
  field: string;
  value: string;
}

interface ChartBlockProps {
  config: ChartConfig;
  onDrillDown?: (chartId: string, field: string, value: string) => void;
  activeDrillValues?: Record<string, DrillFilter>;
}

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

/* ── Determine if a label is actively selected ── */
function isLabelActive(label: string, chartId: string, activeDrillValues?: Record<string, DrillFilter>) {
  if (!activeDrillValues) return null; // no filtering active
  const myFilter = activeDrillValues[chartId];
  if (!myFilter) return null; // this chart has no active filter
  return myFilter.value === label;
}

function hasAnyActiveFilter(activeDrillValues?: Record<string, DrillFilter>) {
  return activeDrillValues && Object.keys(activeDrillValues).length > 0;
}

/* ── Waterfall chart ── */
function WaterfallChart({ config, onDrillDown, activeDrillValues }: ChartBlockProps) {
  const ds = config.data.datasets[0];
  if (!ds) return null;

  const waterfallData = config.data.labels.map((label, i) => {
    const val = ds.data[i] as number;
    return { name: label, value: val };
  });

  let cumulative = 0;
  const stackedData = waterfallData.map((item, i) => {
    const isTotal = i === waterfallData.length - 1;
    const base = isTotal ? 0 : Math.min(cumulative, cumulative + item.value);
    const height = isTotal ? item.value : Math.abs(item.value);
    const positive = item.value >= 0;
    if (!isTotal) cumulative += item.value;
    return { name: item.name, base, height, positive, isTotal };
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={stackedData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => v.toLocaleString()} />
        <Bar dataKey="base" stackId="wf" fill="transparent" />
        <Bar dataKey="height" stackId="wf" radius={[4, 4, 0, 0]}
          onClick={(d: any) => onDrillDown?.(config.id, "name", d?.name)}
          cursor="pointer"
        >
          {stackedData.map((entry, i) => {
            const active = isLabelActive(entry.name, config.id, activeDrillValues);
            return (
              <Cell key={i}
                fill={entry.isTotal ? COLORS[1] : entry.positive ? COLORS[2] : COLORS[3]}
                opacity={active === false ? 0.3 : 1}
                stroke={active === true ? "#000" : "none"}
                strokeWidth={active === true ? 2 : 0}
              />
            );
          })}
          <LabelList dataKey="height" position="top" formatter={(v: number) => v.toLocaleString()} style={{ fontSize: 10 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Gantt chart ── */
function GanttChart({ config, onDrillDown, activeDrillValues }: ChartBlockProps) {
  const ds = config.data.datasets[0];
  if (!ds) return null;

  const ganttData = config.data.labels.map((label, i) => {
    const d = ds.data[i];
    const start = Array.isArray(d) ? d[0] : 0;
    const end = Array.isArray(d) ? d[1] : (d as number);
    return { name: label, start, duration: end - start, end };
  });

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, ganttData.length * 40 + 60)}>
      <BarChart data={ganttData} layout="vertical" barSize={20}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="start" stackId="gantt" fill="transparent" />
        <Bar dataKey="duration" stackId="gantt" radius={[0, 4, 4, 0]}
          onClick={(d: any) => onDrillDown?.(config.id, "name", d?.name)}
          cursor="pointer"
        >
          {ganttData.map((entry, i) => {
            const active = isLabelActive(entry.name, config.id, activeDrillValues);
            return (
              <Cell key={i}
                fill={COLORS[i % COLORS.length]}
                opacity={active === false ? 0.3 : 1}
                stroke={active === true ? "#000" : "none"}
                strokeWidth={active === true ? 2 : 0}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Heatmap ── */
function HeatmapChart({ config }: ChartBlockProps) {
  const ds = config.data.datasets;
  if (!ds.length) return null;

  const allValues = ds.flatMap((d) => d.data as number[]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const cellW = 60;
  const cellH = 36;
  const leftPad = 120;
  const topPad = 30;
  const width = leftPad + config.data.labels.length * cellW;
  const height = topPad + ds.length * cellH;

  function heatColor(v: number) {
    const t = (v - minVal) / range;
    const r = Math.round(255 * t);
    const g = Math.round(255 * (1 - t * 0.6));
    const b = Math.round(100 + 60 * (1 - t));
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="text-xs">
        {config.data.labels.map((label, ci) => (
          <text key={ci} x={leftPad + ci * cellW + cellW / 2} y={topPad - 8} textAnchor="middle" fontSize={10} fill="currentColor">{label}</text>
        ))}
        {ds.map((dataset, ri) => (
          <g key={ri}>
            <text x={leftPad - 8} y={topPad + ri * cellH + cellH / 2 + 4} textAnchor="end" fontSize={10} fill="currentColor">{dataset.label}</text>
            {(dataset.data as number[]).map((val, ci) => (
              <g key={ci}>
                <rect x={leftPad + ci * cellW} y={topPad + ri * cellH} width={cellW - 2} height={cellH - 2} rx={4} fill={heatColor(val)} />
                <text x={leftPad + ci * cellW + cellW / 2 - 1} y={topPad + ri * cellH + cellH / 2 + 4} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>{val}</text>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ── Treemap ── */
function TreemapChart({ config }: ChartBlockProps) {
  const pieData = toPieData(config);
  if (!pieData.length) return null;

  const treemapData = pieData.map((d, i) => ({
    name: d.name,
    size: d.value,
    fill: COLORS[i % COLORS.length],
  }));

  const CustomContent = (props: any) => {
    const { x, y, width, height, name, fill } = props;
    if (width < 30 || height < 20) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={4} fill={fill} stroke="#fff" strokeWidth={2} />
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(12, width / 6)} fill="#fff" fontWeight={600}>
          {name}
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <Treemap data={treemapData} dataKey="size" nameKey="name" content={<CustomContent />} />
    </ResponsiveContainer>
  );
}

/* ── Main ChartBlock ── */
export default function ChartBlock({ config, onDrillDown, activeDrillValues }: ChartBlockProps) {
  const data = useMemo(() => toChartData(config), [config]);
  const datasets = config.data.datasets;

  const handleClick = useCallback((payload: any) => {
    if (!onDrillDown || !payload) return;
    const label = payload.name || payload.payload?.name;
    if (label) onDrillDown(config.id, "name", label);
  }, [onDrillDown, config.id]);

  const cellOpacity = useCallback((label: string) => {
    const active = isLabelActive(label, config.id, activeDrillValues);
    if (active === null && !hasAnyActiveFilter(activeDrillValues)) return 1;
    if (active === true) return 1;
    if (active === false) return 0.3;
    return 0.7; // other charts have filters but not this one
  }, [config.id, activeDrillValues]);

  const renderChart = () => {
    switch (config.type) {
      case "waterfall":
        return <WaterfallChart config={config} onDrillDown={onDrillDown} activeDrillValues={activeDrillValues} />;
      case "gantt":
        return <GanttChart config={config} onDrillDown={onDrillDown} activeDrillValues={activeDrillValues} />;
      case "heatmap":
        return <HeatmapChart config={config} />;
      case "treemap":
        return <TreemapChart config={config} />;

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
                <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]}
                  onClick={handleClick} cursor="pointer"
                >
                  {data.map((point) => (
                    <Cell key={point.name} opacity={cellOpacity(point.name)} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} onClick={(e: any) => e?.activeLabel && onDrillDown?.(config.id, "name", e.activeLabel)}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {datasets.map((ds, i) => (
                <Line key={ds.label} type="monotone" dataKey={ds.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} cursor="pointer" />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} onClick={(e: any) => e?.activeLabel && onDrillDown?.(config.id, "name", e.activeLabel)}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {datasets.map((ds, i) => (
                <Area key={ds.label} type="monotone" dataKey={ds.label} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} cursor="pointer" />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "doughnut":
      case "pie": {
        const pieData = toPieData(config);
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={config.type === "doughnut" ? 60 : 0} outerRadius={110} label
                onClick={handleClick} cursor="pointer"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={cellOpacity(entry.name)} 
                    stroke={isLabelActive(entry.name, config.id, activeDrillValues) === true ? "#000" : "none"}
                    strokeWidth={isLabelActive(entry.name, config.id, activeDrillValues) === true ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case "radar":
        return (
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              {datasets.map((ds, i) => (
                <Radar key={ds.label} name={ds.label} dataKey={ds.label} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} />
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
                <Scatter key={ds.label} name={ds.label} data={data} fill={COLORS[i % COLORS.length]} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "funnel": {
        const funnelData = toPieData(config);
        return (
          <ResponsiveContainer width="100%" height={320}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={funnelData} isAnimationActive
                onClick={handleClick} cursor="pointer"
              >
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={cellOpacity(entry.name)} />
                ))}
                <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );
      }

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
                <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]}
                  onClick={handleClick} cursor="pointer"
                >
                  {data.map((point) => (
                    <Cell key={point.name} opacity={cellOpacity(point.name)} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="rounded-lg border p-4" style={{ background: "var(--dash-surface, hsl(var(--card)))", borderColor: "var(--dash-outline, hsl(var(--border)))" }}>
      <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--dash-on-surface, hsl(var(--card-foreground)))" }}>{config.title}</h4>
      {renderChart()}
    </div>
  );
}
