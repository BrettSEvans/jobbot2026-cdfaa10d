import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { FileDown, History, Eye } from "lucide-react";
import { downloadHtmlAsPdf } from "@/lib/htmlToPdf";

import { getExecutiveReportRevisions } from "@/lib/api/executiveReportRevisions";
import { getRaidLogRevisions } from "@/lib/api/raidLogRevisions";
import { getArchitectureDiagramRevisions } from "@/lib/api/architectureDiagramRevisions";
import { getRoadmapRevisions } from "@/lib/api/roadmapRevisions";

export type AssetType = "executive-report" | "raid-log" | "architecture-diagram" | "roadmap";

const ASSET_LABELS: Record<AssetType, string> = {
  "executive-report": "Executive Report",
  "raid-log": "RAID Log",
  "architecture-diagram": "Architecture Diagram",
  "roadmap": "Roadmap",
};

const fetcherMap: Record<AssetType, (appId: string) => Promise<any[]>> = {
  "executive-report": getExecutiveReportRevisions,
  "raid-log": getRaidLogRevisions,
  "architecture-diagram": getArchitectureDiagramRevisions,
  "roadmap": getRoadmapRevisions,
};

interface AssetRevisionsProps {
  applicationId: string;
  assetType: AssetType;
  currentHtml: string;
  onPreviewRevision: (html: string) => void;
  refreshTrigger?: number;
}

export default function AssetRevisions({
  applicationId,
  assetType,
  currentHtml,
  onPreviewRevision,
  refreshTrigger,
}: AssetRevisionsProps) {
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRevisions();
  }, [applicationId, assetType, refreshTrigger]);

  const loadRevisions = async () => {
    setLoading(true);
    try {
      const fetcher = fetcherMap[assetType];
      const data = await fetcher(applicationId);
      setRevisions(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (html: string, label: string, revisionNumber: number) => {
    const filename = `${assetType}-v${revisionNumber}-${label.replace(/\s+/g, "-").toLowerCase()}.pdf`;
    downloadHtmlAsPdf(html, filename);
    toast({ title: "PDF export", description: `Version ${revisionNumber} — save as PDF from the print dialog.` });
  };

  const handlePreview = (revision: any) => {
    if (previewingId === revision.id) {
      setPreviewingId(null);
      onPreviewRevision(currentHtml);
    } else {
      setPreviewingId(revision.id);
      onPreviewRevision(revision.html);
    }
  };

  if (revisions.length === 0 && !loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          {ASSET_LABELS[assetType]} History
          <Badge variant="secondary" className="text-xs">{revisions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[240px]">
          <div className="space-y-2">
            {revisions.map((rev) => (
              <div
                key={rev.id}
                className={`flex items-center justify-between p-2 rounded-md border text-sm transition-colors ${
                  previewingId === rev.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-xs shrink-0">
                    v{rev.revision_number}
                  </Badge>
                  <span className="truncate text-muted-foreground">
                    {rev.label}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(rev.created_at).toLocaleDateString()}{" "}
                    {new Date(rev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant={previewingId === rev.id ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handlePreview(rev)}
                    title={previewingId === rev.id ? "Back to current" : "Preview this version"}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(rev.html, rev.label, rev.revision_number)}
                    title="Download PDF"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
