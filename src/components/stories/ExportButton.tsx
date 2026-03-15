import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { Story } from "@/hooks/useStories";
import { Epic } from "@/hooks/useEpics";

interface ExportButtonProps { stories: Story[]; epics: Epic[]; sprintName?: string; }

export function ExportButton({ stories, epics, sprintName }: ExportButtonProps) {
  const epicMap = Object.fromEntries(epics.map((e) => [e.id, e.name]));
  const rows = stories.map((s) => ({
    title: s.title, status: s.status, priority: s.priority, epic: epicMap[s.epic_id] ?? "",
    story_points: s.story_points ?? "", persona: s.persona ?? "",
    labels: s.labels?.join(", ") ?? "", due_date: s.due_date ?? "", description: s.description ?? "",
  }));

  const download = (content: string, ext: string) => {
    const blob = new Blob([content], { type: ext === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${sprintName ?? "stories"}-export.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const keys = Object.keys(rows[0] ?? {});
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String((r as any)[k]).replace(/"/g, '""')}"`).join(","))].join("\n");
    download(csv, "csv");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportCSV} className="text-xs">Export CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => download(JSON.stringify(rows, null, 2), "json")} className="text-xs">Export JSON</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
