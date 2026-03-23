import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getJobApplications, deleteJobApplication } from "@/lib/api/jobApplication";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PipelineBoard } from "@/components/PipelineBoard";
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
  RefreshCw,
  AlertTriangle,
  User,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CompanyIcon } from "@/components/CompanyIcon";
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
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { useActiveJobCount } from "@/hooks/useBackgroundJob";
import { supabase } from "@/integrations/supabase/client";
import type { JobApplicationListItem } from "@/types/models";

type SortKey = "company_name" | "job_title" | "status" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";

const Applications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<JobApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Story 1.2: Profile completeness check
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("resume_text").eq("id", user.id).single()
          .then(({ data }) => {
            if (!data?.resume_text) setProfileIncomplete(true);
          });
      }
    });
  }, []);

  const activeJobCount = useActiveJobCount();

  useEffect(() => {
    loadApplications();
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const unsub = backgroundGenerator.subscribe(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => loadApplications(), 2000);
    });
    return () => { unsub(); if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const loadApplications = async () => {
    try {
      const data = await getJobApplications();
      setApplications(data as JobApplicationListItem[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Story 3.2: Delete with confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteJobApplication(deleteTarget.id);
      setApplications((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast({ title: "Deleted", description: "Application removed." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  // Story 3.1: Retry failed generation
  const handleRetry = async (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Reset generation status and re-trigger
      const { data: appData } = await supabase
        .from("job_applications")
        .select("*")
        .eq("id", appId)
        .single();
      if (!appData) return;
      
      await supabase
        .from("job_applications")
        .update({ generation_status: "idle", generation_error: null, status: "draft" })
        .eq("id", appId);

      backgroundGenerator.startFullGeneration({
        applicationId: appId,
        jobUrl: appData.job_url,
        jobDescription: appData.job_description_markdown || "",
      });
      toast({ title: "Retrying", description: "Generation restarted in background." });
      loadApplications();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
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
        {/* Story 1.2: Profile completeness nudge */}
        {profileIncomplete && !bannerDismissed && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <User className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-medium">Complete your profile</span> — add your resume text to unlock keyword matching and resume optimization.
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
              Go to Profile
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBannerDismissed(true)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Job Applications</h1>
            <p className="text-muted-foreground text-sm">Your saved applications and dashboards</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/templates")}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Templates
            </Button>
            <Button onClick={() => navigate("/applications/new")} data-tour="new-app">
              <Plus className="mr-2 h-4 w-4" /> New Application
            </Button>
          </div>
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
          <>
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
                    {/* Story 5.2: Hide date columns on mobile */}
                    <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("created_at")}>
                      <div className="flex items-center">Created <SortIcon col="created_at" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("updated_at")}>
                      <div className="flex items-center">Updated <SortIcon col="updated_at" /></div>
                    </TableHead>
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
                        <div className="flex items-center gap-2">
                          <CompanyIcon
                            companyName={app.company_name}
                            companyUrl={app.company_url}
                            iconUrl={app.company_icon_url}
                          />
                          {app.company_name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>{app.job_title || "Unknown"}</TableCell>
                      <TableCell>
                        <ApplicationStatusCell appId={app.id} dbStatus={app.status} generationStatus={app.generation_status} generationError={app.generation_error} />
                      </TableCell>
                      {/* Story 5.2 */}
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {new Date(app.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          {/* Story 3.1: Retry button for errored applications */}
                          {(app.status === "error" || app.generation_status === "error") && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" onClick={(e) => handleRetry(app.id, e)} title="Retry generation">
                                    <RefreshCw className="h-4 w-4 text-primary" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs max-w-xs">{app.generation_error || "Retry generation"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
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
                          {/* Story 3.2: Delete with confirmation */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ id: app.id, name: app.company_name || "this application" });
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {/* Story 3.2: Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the application for <strong>{deleteTarget?.name}</strong> and all its generated content (cover letter, dashboard, resume). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/** Story 3.3: Per-row status cell with DB-based generation status */
function ApplicationStatusCell({ appId, dbStatus, generationStatus, generationError }: { appId: string; dbStatus: string; generationStatus: string; generationError?: string | null }) {
  const bgJob = backgroundGenerator.getJob(appId);
  const isActive = bgJob && !["complete", "error"].includes(bgJob.status);

  if (isActive) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5 w-fit">
        <Loader2 className="h-3 w-3 animate-spin" />
        {bgJob?.progress ? bgJob.progress.slice(0, 30) : "Generating..."}
      </Badge>
    );
  }

  const isComplete = dbStatus === "complete" || generationStatus === "complete";
  const isError = dbStatus === "error" || generationStatus === "error";
  const isGenerating = !isComplete && !isError && generationStatus && !["idle", "pending"].includes(generationStatus);

  if (isGenerating) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5 w-fit">
        <Loader2 className="h-3 w-3 animate-spin" />
        {generationStatus === "scraping" || generationStatus === "reviewing-job" ? "Reviewing..." : generationStatus === "analyzing" ? "Analyzing..." : generationStatus === "resume" ? "Resume..." : "Generating..."}
      </Badge>
    );
  }

  if (isError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="flex items-center gap-1.5 w-fit cursor-help">
              <AlertTriangle className="h-3 w-3" />
              Error
            </Badge>
          </TooltipTrigger>
          {generationError && (
            <TooltipContent side="top" className="max-w-xs text-xs">
              {generationError}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  const label = isComplete ? "Complete" : dbStatus === "draft" ? "Draft" : dbStatus;
  return <Badge variant={isComplete ? "default" : "secondary"}>{label}</Badge>;
}

export default Applications;
