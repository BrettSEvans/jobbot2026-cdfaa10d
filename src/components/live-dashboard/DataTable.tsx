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

export default function DataTable({ config }: { config: TableConfig }) {
  const rows = generateRows(config);

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h4 className="text-sm font-semibold text-card-foreground">{config.title}</h4>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.map((col) => (
                <TableHead key={col.key} className="text-xs whitespace-nowrap">{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 50).map((row, i) => (
              <TableRow key={i}>
                {config.columns.map((col) => (
                  <TableCell key={col.key} className="text-sm">{row[col.key] ?? ""}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rows.length > 50 && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-t">
          Showing 50 of {rows.length} rows
        </div>
      )}
    </div>
  );
}
