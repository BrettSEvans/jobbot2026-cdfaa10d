import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getJobApplications, deleteJobApplication } from "@/lib/api/jobApplication";
import {
  Plus,
  FileText,
  Globe,
  Trash2,
  Eye,
  Copy,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Applications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await getJobApplications();
      setApplications(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteJobApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Deleted", description: "Application removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCopyHtml = async (html: string) => {
    await navigator.clipboard.writeText(html);
    toast({ title: "Copied!", description: "Dashboard HTML copied to clipboard." });
  };

  const handleCopyCoverLetter = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Cover letter copied to clipboard." });
  };

  const previewApp = applications.find((a) => a.id === previewId);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Job Applications</h1>
            <p className="text-muted-foreground text-sm">Your saved applications and dashboards</p>
          </div>
          <Button onClick={() => navigate("/applications/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Application
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No applications yet</h3>
              <p className="text-muted-foreground mb-4">Create your first job application to get started.</p>
              <Button onClick={() => navigate("/applications/new")}>
                <Plus className="mr-2 h-4 w-4" /> New Application
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <Card key={app.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/applications/${app.id}`)}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {app.company_name || "Unknown Company"} — {app.job_title || "Unknown Role"}
                        </h3>
                        <Badge variant={app.status === "complete" ? "default" : "secondary"}>
                          {app.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{app.job_url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {app.products?.slice(0, 3).map((p: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                        ))}
                        {app.competitors?.slice(0, 2).map((c: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">vs {c}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {app.cover_letter && (
                        <Button size="sm" variant="ghost" onClick={() => handleCopyCoverLetter(app.cover_letter)} title="Copy cover letter">
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      {app.dashboard_html && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setPreviewId(previewId === app.id ? null : app.id)} title="Preview dashboard">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleCopyHtml(app.dashboard_html)} title="Copy HTML">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(app.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline preview */}
                  {previewId === app.id && app.dashboard_html && (
                    <div className="mt-4 border rounded-lg overflow-hidden" style={{ height: "60vh" }}>
                      <iframe
                        srcDoc={app.dashboard_html}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts"
                        title="Dashboard Preview"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Applications;
