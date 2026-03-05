import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getCoverLetterRevisions } from "@/lib/api/coverLetterRevisions";
import { Download, History, Eye } from "lucide-react";

interface CoverLetterRevisionsProps {
  applicationId: string;
  currentCoverLetter: string;
  onPreviewRevision: (text: string) => void;
  refreshTrigger?: number;
}

export default function CoverLetterRevisions({
  applicationId,
  currentCoverLetter,
  onPreviewRevision,
  refreshTrigger,
}: CoverLetterRevisionsProps) {
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRevisions();
  }, [applicationId, refreshTrigger]);

  const loadRevisions = async () => {
    setLoading(true);
    try {
      const data = await getCoverLetterRevisions(applicationId);
      setRevisions(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (text: string, label: string, revisionNumber: number) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-v${revisionNumber}-${label.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: `Version ${revisionNumber} downloaded.` });
  };

  const handlePreview = (revision: any) => {
    if (previewingId === revision.id) {
      setPreviewingId(null);
      onPreviewRevision(currentCoverLetter);
    } else {
      setPreviewingId(revision.id);
      onPreviewRevision(revision.cover_letter);
    }
  };

  if (revisions.length === 0 && !loading) return null;

  return (
    <Card data-tutorial="revision-history">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Cover Letter History
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
                    onClick={() => handleDownload(rev.cover_letter, rev.label, rev.revision_number)}
                    title="Download cover letter"
                  >
                    <Download className="h-3.5 w-3.5" />
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
