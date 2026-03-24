import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { motion } from "framer-motion";

const STAGES = [
  { id: "bookmarked", label: "Bookmarked" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "accepted", label: "Accepted" },
  { id: "withdrawn", label: "Withdrawn" },
  { id: "ghosted", label: "Ghosted" },
  { id: "rejected", label: "Rejected" },
];

interface PipelineBulkActionBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  onBulkStageChange: (stage: string) => void;
}

export function PipelineBulkActionBar({ selectedIds, onClear, onBulkStageChange }: PipelineBulkActionBarProps) {
  const count = selectedIds.size;
  if (count === 0) return null;

  return (
    <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 shadow-xl">
      <span className="text-xs font-medium text-foreground">{count} selected</span>
      <Select onValueChange={onBulkStageChange}>
        <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue placeholder="Move to stage…" /></SelectTrigger>
        <SelectContent>
          {STAGES.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onClear}><X className="h-3 w-3" /> Clear</Button>
    </motion.div>
  );
}
