import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { GlobalFilter } from "@/lib/dashboard/schema";

interface FilterBarProps {
  filters: GlobalFilter[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
}

export default function FilterBar({ filters, values, onChange }: FilterBarProps) {
  if (!filters.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-card border rounded-lg">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</span>
      {filters.map((f) => {
        if (f.type === "chips") {
          return (
            <div key={f.id} className="flex gap-1.5 items-center">
              <span className="text-xs text-muted-foreground">{f.label}:</span>
              {f.options.map((opt) => (
                <Badge key={opt}
                  variant={values[f.id] === opt ? "default" : "secondary"}
                  className="cursor-pointer text-xs"
                  onClick={() => onChange(f.id, values[f.id] === opt ? "" : opt)}
                >
                  {opt}
                </Badge>
              ))}
            </div>
          );
        }

        if (f.type === "segmented") {
          return (
            <div key={f.id} className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{f.label}:</span>
              <div className="flex bg-secondary rounded-md p-0.5">
                {f.options.map((opt) => (
                  <button key={opt}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      values[f.id] === opt
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-secondary-foreground hover:bg-secondary/80"
                    }`}
                    onClick={() => onChange(f.id, values[f.id] === opt ? "" : opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        // dropdown
        return (
          <Select key={f.id} value={values[f.id] || "__all__"} onValueChange={(v) => onChange(f.id, v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {f.options.filter(Boolean).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}
    </div>
  );
}
