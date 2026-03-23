import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { getResumeRevisions } from "@/lib/api/resumeRevisions";
import { Download, History, Eye, ChevronDown, ChevronRight } from "lucide-react";

interface ResumeRevisionsProps {
  applicationId: string;
  currentHtml: string;
  onPreviewRevision: (html: string | null) => void;
  refreshTrigger?: number;
  resumeType?: string;
}

export default function ResumeRevisions({
  applicationId,
  currentHtml,
  onPreviewRevision,
  refreshTrigger,
  resumeType = "ats",
}: ResumeRevisionsProps) {
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRevisions();
  }, [applicationId, refreshTrigger]);

  const loadRevisions = async () => {
    setLoading(true);
    try {
      const data = await getResumeRevisions(applicationId);
      setRevisions(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const handleDownload = (html: string, label: string, revisionNumber: number) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-v${revisionNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: `Resume v${revisionNumber} downloaded.` });
  };

  const handlePreview = (revision: any) => {
    if (previewingId === revision.id) {
      setPreviewingId(null);
      onPreviewRevision(null);
    } else {
      setPreviewingId(revision.id);
      onPreviewRevision(revision.html);
    }
  };

  if (revisions.length === 0 && !loading) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <History className="h-4 w-4" />
              Resume History
              <Badge variant="secondary" className="text-xs">{revisions.length}</Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {previewingId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Badge variant="secondary">Previewing older version</Badge>
                <Button variant="ghost" size="sm" onClick={() => { setPreviewingId(null); onPreviewRevision(null); }}>
                  Back to current
                </Button>
              </div>
            )}
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
                      <Badge variant="outline" className="text-xs shrink-0">v{rev.revision_number}</Badge>
                      <span className="truncate text-muted-foreground">{rev.label}</span>
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
                        title="Download HTML"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
