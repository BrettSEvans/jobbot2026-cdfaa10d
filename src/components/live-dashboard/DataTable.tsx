import { useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { TableConfig } from "@/lib/dashboard/schema";

function generateRows(config: TableConfig): Array<Record<string, any>> {
  if (config.rows?.length) return config.rows;
  if (!config.generateRows) return [];

  const { count, fields, seed } = config.generateRows;
  const rng = seedRng(seed ?? 42);
  const rows: Array<Record<string, any>> = [];

  for (let i = 0; i < count; i++) {
    const row: Record<string, any> = {};
    for (const [key, gen] of Object.entries(fields)) {
      row[key] = generateField(gen, rng, i);
    }
    rows.push(row);
  }
  return rows;
}

function seedRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function generateField(gen: any, rng: () => number, idx: number): string {
  const firstNames = ["Alex", "Jordan", "Morgan", "Taylor", "Casey", "Quinn", "Riley", "Avery"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore"];
  const companies = ["Acme Corp", "Global Tech", "Nova Systems", "Peak Solutions", "Apex Group"];
  const regions = ["North America", "EMEA", "APAC", "LATAM"];
  const statuses = gen.options || ["Active", "Pending", "Completed"];
  const products = ["Platform", "Analytics", "Cloud", "Mobile", "Enterprise"];

  switch (gen.type) {
    case "personName": return `${firstNames[Math.floor(rng() * firstNames.length)]} ${lastNames[Math.floor(rng() * lastNames.length)]}`;
    case "company": return companies[Math.floor(rng() * companies.length)];
    case "date": { const d = new Date(Date.now() - rng() * 365 * 86400000); return d.toLocaleDateString(); }
    case "futureDate": { const d = new Date(Date.now() + rng() * (gen.maxDays || 90) * 86400000); return d.toLocaleDateString(); }
    case "currency": { const v = (gen.min || 1000) + rng() * ((gen.max || 100000) - (gen.min || 1000)); return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }
    case "status": return statuses[Math.floor(rng() * statuses.length)];
    case "region": return regions[Math.floor(rng() * regions.length)];
    case "product": return products[Math.floor(rng() * products.length)];
    case "percent": return `${Math.round((gen.min || 0) + rng() * ((gen.max || 100) - (gen.min || 0)))}%`;
    case "integer": return String(Math.round((gen.min || 0) + rng() * ((gen.max || 1000) - (gen.min || 0))));
    case "email": return `user${idx}@example.com`;
    case "pick": return (gen.options || ["A", "B", "C"])[Math.floor(rng() * (gen.options?.length || 3))];
    default: return "";
  }
}

export default function DataTable({ config, filterValues = {} }: { config: TableConfig; filterValues?: Record<string, string> }) {
  const allRows = useMemo(() => generateRows(config), [config]);

  const filteredRows = useMemo(() => {
    const activeFilters = Object.entries(filterValues).filter(([, v]) => v);
    if (!activeFilters.length) return allRows;

    return allRows.filter((row) =>
      activeFilters.every(([filterKey, filterVal]) => {
        // Check if any column value matches the filter
        const colKeys = config.columns.map((c) => c.key);
        return colKeys.some((ck) => {
          const cellVal = String(row[ck] ?? "");
          return cellVal === filterVal;
        });
      })
    );
  }, [allRows, filterValues, config.columns]);

  const isFiltered = filteredRows.length !== allRows.length;
  const displayRows = filteredRows.slice(0, 50);

  return (
    <div className="rounded-lg border overflow-hidden" style={{ background: "var(--dash-surface, hsl(var(--card)))", borderColor: "var(--dash-outline, hsl(var(--border)))" }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--dash-outline, hsl(var(--border)))" }}>
        <h4 className="text-sm font-semibold" style={{ color: "var(--dash-on-surface, hsl(var(--card-foreground)))" }}>{config.title}</h4>
        {isFiltered && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--dash-primary-container, hsl(var(--accent)))", color: "var(--dash-on-primary-container, hsl(var(--accent-foreground)))" }}>
            {filteredRows.length} of {allRows.length} records
          </span>
        )}
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.map((col) => (
                <TableHead key={col.key} className="text-xs whitespace-nowrap font-semibold" style={{ color: "var(--dash-on-surface, hsl(var(--foreground)))" }}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, i) => (
              <TableRow key={i}>
                {config.columns.map((col) => (
                  <TableCell key={col.key} className="text-sm">{row[col.key] ?? ""}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filteredRows.length > 50 && (
        <div className="px-4 py-2 text-xs border-t" style={{ color: "var(--dash-on-surface, hsl(var(--muted-foreground)))", opacity: 0.6, borderColor: "var(--dash-outline, hsl(var(--border)))" }}>
          Showing 50 of {filteredRows.length} rows
        </div>
      )}
    </div>
  );
}
