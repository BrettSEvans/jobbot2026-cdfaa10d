import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  getJobApplications,
  deleteJobApplication,
  getDeletedJobApplications,
  restoreJobApplication,
  permanentlyDeleteJobApplication,
} from "@/lib/api/jobApplication";
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
  Undo2,
  Clock,
  Archive,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { useActiveJobCount } from "@/hooks/useBackgroundJob";
import BatchModePrompt from "@/components/BatchModePrompt";
import ImpersonationNotice from "@/components/ImpersonationNotice";
import { useImpersonation } from "@/contexts/ImpersonationContext";
type SortKey = "company_name" | "job_title" | "status" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";

const Applications = () => {
  const { activePersona, isImpersonating } = useImpersonation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [deletedApps, setDeletedApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeView, setActiveView] = useState<"active" | "trash">("active");
  const [isClosing, setIsClosing] = useState(false);

  const activeJobCount = useActiveJobCount();

  const handleClosePreview = () => {
    setIsClosing(true);
    setTimeout(() => {
      setPreviewId(null);
      setIsClosing(false);
    }, 300);
  };

  useEffect(() => {
    loadApplications();
  }, [isImpersonating, activePersona?.id]);

  useEffect(() => {
    const unsub = backgroundGenerator.subscribe(() => {
      loadApplications();
    });
    return () => { unsub(); };
  }, []);

  const loadApplications = async () => {
    try {
      const personaId = isImpersonating && activePersona?.isTestUser ? activePersona.id : null;
      const data = await getJobApplications(personaId);
      setApplications(data);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadTrash = async () => {
    setTrashLoading(true);
    try {
      const personaId = isImpersonating && activePersona?.isTestUser ? activePersona.id : null;
      const data = await getDeletedJobApplications(personaId);
      setDeletedApps(data || []);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setTrashLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === "trash") loadTrash();
  }, [activeView]);

  const handleSoftDelete = async (id: string) => {
    try {
      await deleteJobApplication(id);
      const removed = applications.find((a) => a.id === id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      toast({
        title: "Moved to trash",
        description: "Application can be recovered within 30 days.",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await restoreJobApplication(id);
                if (removed) setApplications((prev) => [removed, ...prev]);
                toast({ title: "Restored", description: "Application restored successfully." });
              } catch {
                toast({ title: "Error", description: "Failed to undo.", variant: "destructive" });
              }
            }}
          >
            <Undo2 className="mr-1 h-3 w-3" /> Undo
          </Button>
        ),
      });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreJobApplication(id);
      setDeletedApps((prev) => prev.filter((a) => a.id !== id));
      loadApplications();
      toast({ title: "Restored", description: "Application restored to your active list." });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await permanentlyDeleteJobApplication(id);
      setDeletedApps((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Permanently deleted", description: "Application and all assets have been removed." });
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

  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <ImpersonationNotice />
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
        ) : applications.length === 0 && activeView === "active" && deletedApps.length === 0 ? (
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
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "active" | "trash")}>
            <TabsList>
              <TabsTrigger value="active">Applications</TabsTrigger>
              <TabsTrigger value="trash" className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Trash
                {deletedApps.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                    {deletedApps.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <BatchModePrompt applicationCount={applications.length} />
              {applications.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No active applications. Create one or check your trash.</p>
                    <Button onClick={() => navigate("/applications/new")}>
                      <Plus className="mr-2 h-4 w-4" /> New Application
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-md border min-h-[400px]">
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
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="sm" variant="ghost" onClick={(e) => handleCopyCoverLetter(app.cover_letter, e)}>
                                        <FileText className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy cover letter</TooltipContent>
                                  </Tooltip>
                                )}
                                {app.dashboard_html && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (previewId === app.id) {
                                              handleClosePreview();
                                            } else {
                                              setIsClosing(false);
                                              setPreviewId(app.id);
                                            }
                                          }}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Preview dashboard</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button size="sm" variant="ghost" onClick={(e) => handleCopyHtml(app.dashboard_html, e)}>
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Copy HTML</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                                <AlertDialog>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="ghost">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Move to trash</TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        <strong>{app.company_name || "This application"}</strong> will be moved to trash. You can recover it within 30 days.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleSoftDelete(app.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Move to Trash
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

                    {/* Slide-in preview panel */}
                    {previewApp?.dashboard_html && (
                      <div
                        className={`absolute inset-0 z-10 bg-background flex flex-col w-full md:w-[70%] md:left-auto md:right-0 md:border-l ${
                          isClosing ? "animate-slide-out-right" : "animate-slide-in-right"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50 shrink-0">
                          <span className="text-sm font-medium text-muted-foreground truncate">
                            {previewApp.company_name} — {previewApp.job_title}
                          </span>
                          <Button size="sm" variant="ghost" onClick={handleClosePreview}>
                            ✕ Close
                          </Button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <iframe
                            srcDoc={previewApp.dashboard_html}
                            className="border-0"
                            sandbox="allow-scripts"
                            title="Dashboard Preview"
                            style={{
                              width: "200%",
                              height: "200%",
                              transform: "scale(0.5)",
                              transformOrigin: "top left",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="trash" className="space-y-4">
              {trashLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : deletedApps.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Trash2 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No deleted applications.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Deleted</TableHead>
                        <TableHead>Time Remaining</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedApps.map((app: any) => {
                        const days = getDaysRemaining(app.deleted_at);
                        return (
                          <TableRow key={app.id} className="opacity-70">
                            <TableCell className="font-medium">{app.company_name || "Unknown"}</TableCell>
                            <TableCell>{app.job_title || "Unknown"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(app.deleted_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={days <= 7 ? "destructive" : "secondary"} className="gap-1">
                                <Clock className="h-3 w-3" /> {days} day{days !== 1 ? "s" : ""} left
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="outline" onClick={() => handleRestore(app.id)}>
                                  <Undo2 className="mr-1 h-3 w-3" /> Restore
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete <strong>{app.company_name || "this application"}</strong> and all its assets. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handlePermanentDelete(app.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete Forever
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
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
  { key: "dashboard_html", label: "Dashboard", assetType: "dashboard" },
  { key: "cover_letter", label: "Cover Letter", assetType: "cover-letter" },
  { key: "executive_report_html", label: "Executive Report", assetType: "executive-report" },
  { key: "raid_log_html", label: "RAID Log", assetType: "raid-log" },
  { key: "architecture_diagram_html", label: "Architecture", assetType: "architecture-diagram" },
  { key: "roadmap_html", label: "Roadmap", assetType: "roadmap" },
] as const;

function AssetDots({ app }: { app: JobApplication }) {
  const activeTypes = backgroundGenerator.getActiveAssetTypesForApp(app.id);

  return (
    <div className="flex items-center gap-1">
      {ASSET_FIELDS.map((f) => {
        const has = !!(app as any)[f.key];
        const isActive = activeTypes.includes(f.assetType);
        return (
          <Tooltip key={f.key}>
            <TooltipTrigger asChild>
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  isActive
                    ? "bg-primary animate-pulse"
                    : has
                    ? "bg-primary"
                    : "bg-muted-foreground/25"
                }`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {f.label}: {isActive ? "⏳ Generating..." : has ? "✓" : "—"}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default Applications;
