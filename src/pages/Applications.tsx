import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getJobApplications, deleteJobApplication } from "@/lib/api/jobApplication";
import type { JobApplication } from "@/hooks/useApplicationDetail";
import {
  Plus,
  FileText,
  Trash2,
  Eye,
  Copy,
  Loader2,
  LayoutTemplate,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Zap,
  FileCheck,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { useActiveJobCount } from "@/hooks/useBackgroundJob";
import BatchModePrompt from "@/components/BatchModePrompt";

type SortKey = "company_name" | "job_title" | "status" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";

const Applications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const activeJobCount = useActiveJobCount();

  useEffect(() => {
    loadApplications();
  }, []);

  // Re-fetch applications when background jobs complete
  useEffect(() => {
    const unsub = backgroundGenerator.subscribe(() => {
      loadApplications();
    });
    return () => { unsub(); };
  }, []);

  const loadApplications = async () => {
    try {
      const data = await getJobApplications();
      setApplications(data);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteJobApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Deleted", description: "Application removed." });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleCopyHtml = async (html: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(html);
    toast({ title: "Copied!", description: "Dashboard HTML copied to clipboard." });
  };

  const handleCopyCoverLetter = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Cover letter copied to clipboard." });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    return [...applications].sort((a, b) => {
      const aVal = (a[sortKey] || "").toString().toLowerCase();
      const bVal = (b[sortKey] || "").toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [applications, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const previewApp = applications.find((a) => a.id === previewId);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Job Applications</h1>
            <p className="text-muted-foreground text-sm">Your saved applications and dashboards</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/templates")}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Templates
            </Button>
            <Button onClick={() => navigate("/applications/new")}>
              <Plus className="mr-2 h-4 w-4" /> New Application
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : applications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-6">
              <div className="flex justify-center gap-4 text-muted-foreground">
                <BarChart3 className="h-10 w-10" />
                <FileCheck className="h-10 w-10" />
                <Sparkles className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold mb-2">Welcome to JobBot</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Paste a job URL and we'll generate a <strong>branded dashboard</strong>, <strong>tailored cover letter</strong>, and <strong>6 executive reports</strong> — all customized to the company's branding.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={() => navigate("/applications/new")} size="lg">
                  <Zap className="mr-2 h-4 w-4" /> Create Your First Application
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-left">
                <div className="space-y-1">
                  <p className="text-sm font-medium">1. Paste a job URL</p>
                  <p className="text-sm text-muted-foreground">Or paste the description directly</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">2. AI analyzes & builds</p>
                  <p className="text-sm text-muted-foreground">Scrapes branding, competitors, market data</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">3. Refine with AI chat</p>
                  <p className="text-sm text-muted-foreground">Iterate on any asset with conversational AI</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <BatchModePrompt applicationCount={applications.length} />
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("company_name")}>
                      <div className="flex items-center">Company <SortIcon col="company_name" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("job_title")}>
                      <div className="flex items-center">Role <SortIcon col="job_title" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                      <div className="flex items-center">Status <SortIcon col="status" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                      <div className="flex items-center">Created <SortIcon col="created_at" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("updated_at")}>
                      <div className="flex items-center">Updated <SortIcon col="updated_at" /></div>
                    </TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((app) => (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/applications/${app.id}`)}
                    >
                      <TableCell className="font-medium">
                        {app.company_name || "Unknown"}
                      </TableCell>
                      <TableCell>{app.job_title || "Unknown"}</TableCell>
                      <TableCell>
                        <ApplicationStatusCell appId={app.id} dbStatus={app.status} generationStatus={app.generation_status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(app.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <AssetDots app={app} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          {app.cover_letter && (
                            <Button size="sm" variant="ghost" onClick={(e) => handleCopyCoverLetter(app.cover_letter, e)} title="Copy cover letter">
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {app.dashboard_html && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewId(previewId === app.id ? null : app.id);
                                }}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={(e) => handleCopyHtml(app.dashboard_html, e)} title="Copy HTML">
                                <Copy className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete application?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the application for <strong>{app.company_name || "this company"}</strong> and all its generated assets. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(app.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Inline preview */}
            {previewApp?.dashboard_html && (
              <Card className="overflow-hidden">
                <div className="p-2 bg-muted flex items-center justify-between">
                  <span className="text-sm font-medium px-2">
                    Preview: {previewApp.company_name} — {previewApp.job_title}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setPreviewId(null)}>Close</Button>
                </div>
                <div style={{ height: "60vh" }}>
                  <iframe
                    srcDoc={previewApp.dashboard_html}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts"
                    title="Dashboard Preview"
                  />
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/** Per-row status cell that reacts to background generation state */
function ApplicationStatusCell({ appId, dbStatus, generationStatus }: { appId: string; dbStatus: string; generationStatus: string }) {
  const bgJob = backgroundGenerator.getJob(appId);
  const isActive = bgJob && !["complete", "error"].includes(bgJob.status);

  if (isActive) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5 w-fit">
        <Loader2 className="h-3 w-3 animate-spin" />
        Generating...
      </Badge>
    );
  }

  // Determine display status: trust dbStatus first, fall back to generation_status
  const isComplete = dbStatus === "complete" || generationStatus === "complete";
  const isError = dbStatus === "error" || generationStatus === "error";
  const isGenerating = !isComplete && !isError && generationStatus && !["idle", "pending"].includes(generationStatus);

  if (isGenerating) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5 w-fit">
        <Loader2 className="h-3 w-3 animate-spin" />
        Generating...
      </Badge>
    );
  }

  const label = isComplete ? "Complete" : isError ? "Error" : dbStatus === "draft" ? "Draft" : dbStatus;

  return (
    <Badge variant={isComplete ? "default" : isError ? "destructive" : "secondary"}>
      {label}
    </Badge>
  );
}

const ASSET_FIELDS = [
  { key: "dashboard_html", label: "Dashboard" },
  { key: "cover_letter", label: "Cover Letter" },
  { key: "executive_report_html", label: "Executive Report" },
  { key: "raid_log_html", label: "RAID Log" },
  { key: "architecture_diagram_html", label: "Architecture" },
  { key: "roadmap_html", label: "Roadmap" },
] as const;

function AssetDots({ app }: { app: JobApplication }) {
  return (
    <div className="flex items-center gap-1">
      {ASSET_FIELDS.map((f) => {
        const has = !!(app as any)[f.key];
        return (
          <Tooltip key={f.key}>
            <TooltipTrigger asChild>
              <div
                className={`h-2.5 w-2.5 rounded-full ${has ? "bg-primary" : "bg-muted-foreground/25"}`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {f.label}: {has ? "✓" : "—"}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default Applications;
