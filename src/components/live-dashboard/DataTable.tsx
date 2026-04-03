import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, Inbox } from "lucide-react";
import type { TableConfig } from "@/lib/dashboard/schema";
import type { DrillFilter } from "./ChartBlock";

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

export default function DataTable({
  config,
  drillFilters = {},
}: {
  config: TableConfig;
  drillFilters?: Record<string, DrillFilter>;
}) {
  const allRows = useMemo(() => generateRows(config), [config]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const activeFilterValues = useMemo(() => {
    return Object.values(drillFilters).map((f) => f.value);
  }, [drillFilters]);

  const filteredRows = useMemo(() => {
    if (!activeFilterValues.length) return allRows;

    return allRows.filter((row) => {
      const colKeys = config.columns.map((c) => c.key);
      return activeFilterValues.every((filterVal) =>
        colKeys.some((ck) => String(row[ck] ?? "") === filterVal)
      );
    });
  }, [allRows, activeFilterValues, config.columns]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aVal = String(a[sortColumn] ?? "");
      const bVal = String(b[sortColumn] ?? "");
      const numA = parseFloat(aVal.replace(/[^0-9.-]/g, ""));
      const numB = parseFloat(bVal.replace(/[^0-9.-]/g, ""));
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }
      return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredRows, sortColumn, sortDirection]);

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(colKey);
      setSortDirection("asc");
    }
  };

  const isFiltered = filteredRows.length !== allRows.length;
  const displayRows = sortedRows.slice(0, 50);

  return (
    <div
      className="rounded-[32px] overflow-hidden transition-all duration-300"
      style={{
        background: "var(--dash-surface, #E0E5EC)",
        boxShadow: "9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)",
      }}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <h4 className="text-sm font-bold" style={{ color: "var(--dash-on-surface, #3D4852)" }}>{config.title}</h4>
        {isFiltered && (
          <span className="text-xs px-2 py-0.5 rounded-2xl" style={{ background: "var(--dash-primary-container, #D0E8E8)", color: "var(--dash-on-primary-container, #0a5050)" }}>
            {filteredRows.length} of {allRows.length} records
          </span>
        )}
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.map((col) => (
                <TableHead
                  key={col.key}
                  className="text-xs whitespace-nowrap font-semibold cursor-pointer select-none hover:bg-muted/30 transition-colors"
                  style={{ color: "var(--dash-on-surface, #3D4852)" }}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortColumn === col.key && (
                      sortDirection === "asc"
                        ? <ArrowUp className="h-3 w-3 opacity-70" />
                        : <ArrowDown className="h-3 w-3 opacity-70" />
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={config.columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No matching records</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row, i) => (
                <TableRow key={i}>
                  {config.columns.map((col) => (
                    <TableCell key={col.key} className="text-sm" style={{ color: "var(--dash-on-surface, hsl(var(--foreground)))" }}>{row[col.key] ?? ""}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
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
