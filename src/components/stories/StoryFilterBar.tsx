import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface StoryFilters {
  search: string;
  priority: string;
  persona: string;
  labels: string[];
  overdueOnly: boolean;
}

interface StoryFilterBarProps {
  filters: StoryFilters;
  onChange: (filters: StoryFilters) => void;
  personas: string[];
  allLabels: string[];
}

const PRIORITIES = ["critical", "high", "medium", "low"];

export function StoryFilterBar({ filters, onChange, personas, allLabels }: StoryFilterBarProps) {
  const hasFilters = filters.search || filters.priority !== "all" || filters.persona !== "all" || filters.labels.length > 0 || filters.overdueOnly;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={filters.search} onChange={(e) => onChange({ ...filters, search: e.target.value })} placeholder="Search stories..." className="pl-8 h-8 text-xs" />
      </div>
      <Tooltip><TooltipTrigger asChild><div>
        <Select value={filters.priority} onValueChange={(v) => onChange({ ...filters, priority: v })}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div></TooltipTrigger><TooltipContent>Filter by priority level</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><div>
        <Select value={filters.persona} onValueChange={(v) => onChange({ ...filters, persona: v })}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Persona" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Personas</SelectItem>
            {personas.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div></TooltipTrigger><TooltipContent>Filter by user persona</TooltipContent></Tooltip>
      {allLabels.length > 0 && (
        <Select value={filters.labels.length === 1 ? filters.labels[0] : "all"} onValueChange={(v) => onChange({ ...filters, labels: v === "all" ? [] : [v] })}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Label" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            {allLabels.map((l) => <SelectItem key={l} value={l} className="text-xs capitalize">{l}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <div className="flex items-center gap-1.5">
        <Switch id="overdue-toggle" checked={filters.overdueOnly} onCheckedChange={(v) => onChange({ ...filters, overdueOnly: v })} className="scale-75" />
        <Label htmlFor="overdue-toggle" className="text-[11px] text-muted-foreground cursor-pointer">Overdue</Label>
      </div>
      {hasFilters && (
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => onChange({ search: "", priority: "all", persona: "all", labels: [], overdueOnly: false })}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        </TooltipTrigger><TooltipContent>Clear all filters</TooltipContent></Tooltip>
      )}
    </div>
  );
}
