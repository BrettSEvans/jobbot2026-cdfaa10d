import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProUsageBar from "@/components/ProUsageBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import CompanyIcon from "@/components/CompanyIcon";
import KanbanBoard from "@/components/KanbanBoard";
import PipelineAnalytics from "@/components/PipelineAnalytics";
import GhostPromptDialog from "@/components/GhostPromptDialog";
import { updatePipelineStage, type PipelineStage } from "@/lib/pipelineStages";
import { useStalePipelinePrompt } from "@/hooks/useStalePipelinePrompt";
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
  Trash2,
  Loader2,
  LayoutTemplate,
  ArrowUpDown,
  AlertCircle,
  Sparkles,
  Zap,
  FileCheck,
  BarChart3,
  Undo2,
  Clock,
  Archive,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Kanban } from "lucide-react";
import { useSearchParams } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { useActiveJobCount } from "@/hooks/useBackgroundJob";
import BatchModePrompt from "@/components/BatchModePrompt";
import ImpersonationNotice from "@/components/ImpersonationNotice";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useTutorial } from "@/hooks/useTutorial";
import { BookOpen } from "lucide-react";
import { BRAND } from "@/lib/branding";
import { ImageIcon } from "lucide-react";
import ApplicationCommandCard from "@/components/ApplicationCommandCard";
type SortKey = "company_name" | "job_title" | "status" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";
const Applications = () => {
  const { activePersona, isImpersonating } = useImpersonation();
  const { showTutorial, startTutorial } = useTutorial();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [deletedApps, setDeletedApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const initialView = searchParams.get("view") === "pipeline" ? "pipeline" : "active";
  const [activeView, setActiveView] = useState<"active" | "pipeline" | "trash">(initialView);
  const [isClosing, setIsClosing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const activeJobCount = useActiveJobCount();

  const { staleApp: staleBookmarkedApp, dismiss: dismissBookmarked } = useStalePipelinePrompt(applications, {
    stage: 'bookmarked', thresholdMs: 48 * 60 * 60 * 1000, storageKey: 'dismissed_bookmarked_prompts',
  });
  const { staleApp: staleAppliedApp, dismiss: dismissApplied } = useStalePipelinePrompt(applications, {
    stage: 'applied', thresholdMs: 10 * 24 * 60 * 60 * 1000, storageKey: 'dismissed_ghost_prompts',
  });
  const { staleApp: staleInterviewingApp, dismiss: dismissInterviewing } = useStalePipelinePrompt(applications, {
    stage: 'interviewing', thresholdMs: 7 * 24 * 60 * 60 * 1000, storageKey: 'dismissed_ghost_interview_prompts',
  });

  const markStaleAsGhosted = useCallback(async (appId: string, fromStage: PipelineStage, dismiss: (id: string) => void) => {
    try {
      await updatePipelineStage(appId, fromStage, 'ghosted');
      dismiss(appId);
      loadApplications();
      toast({ title: "Marked as ghosted", description: "Application moved to Ghosted stage." });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  }, [toast]);

  // Check if any apps are missing icons
  const needsBackfill = useMemo(
    () => applications.some((a) => a.company_name && !a.company_icon_url),
    [applications]
  );

  const handleBackfillIcons = useCallback(async () => {
    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-company-icons');
      if (error) throw error;
      toast({ title: "Icons updated", description: `Updated ${data?.updated ?? 0} of ${data?.total ?? 0} applications.` });
      loadApplications();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Backfill failed", variant: "destructive" });
    } finally {
      setBackfilling(false);
    }
  }, [toast]);

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
      toast({ title: "Permanently deleted", description: "Application and all materials have been removed." });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleCopyToClipboard = useCallback(async (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  }, [toast]);

  const sorted = useMemo(() => {
    return [...applications].sort((a, b) => {
      const aVal = (a[sortKey] || "").toString().toLowerCase();
      const bVal = (b[sortKey] || "").toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [applications, sortKey, sortDir]);

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
        {showTutorial && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="text-sm text-foreground"><strong>New here?</strong> Take a quick tour to learn how {BRAND.name} works.</p>
            <Button size="sm" variant="outline" onClick={startTutorial} className="shrink-0">
              <BookOpen className="mr-2 h-4 w-4" /> Take the Tour
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight">Job Applications</h1>
            <p className="text-muted-foreground text-sm">Your career command center</p>
          </div>
          <div className="flex gap-2">
            {needsBackfill && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleBackfillIcons} disabled={backfilling} aria-label="Backfill company icons">
                    {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fetch missing company logos</TooltipContent>
              </Tooltip>
            )}
            <Button variant="outline" onClick={() => navigate("/templates")}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Templates
            </Button>
            <Button data-tutorial="new-app-btn" onClick={() => navigate("/applications/new")}>
              <Plus className="mr-2 h-4 w-4" /> New Application
            </Button>
          </div>
        </div>

        <ProUsageBar />

        {/* 48-hour bookmarked nudge */}
        {staleBookmarkedApp && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
              <p className="text-foreground">
                Have you applied to <strong>{staleBookmarkedApp.company_name || 'this job'}</strong>? It's been bookmarked for over 48 hours.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <Button size="sm" variant="outline" onClick={() => dismissBookmarked(staleBookmarkedApp.id)} className="flex-1 sm:flex-initial">
                Dismiss
              </Button>
              <Button size="sm" onClick={() => navigate(`/applications/${staleBookmarkedApp.id}`)} className="flex-1 sm:flex-initial">
                Update Status
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-28 bg-muted rounded" />
                      <div className="h-3 w-36 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-muted" />
                        <div className="h-2 w-10 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="h-1.5 rounded-full bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : applications.length === 0 && activeView === "active" && deletedApps.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center space-y-8">
              {/* Hero messaging - Portfolio Builder, not just resumes */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
                  <Sparkles className="h-4 w-4" />
                  More than a resume writer
                </div>
                <h3 className="text-2xl font-heading font-bold">Build Your Career Portfolio</h3>
                <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  {BRAND.name} creates a complete <strong>job application portfolio</strong> for every role — 
                  branded dashboards, tailored resumes, cover letters, roadmaps, executive reports, 
                  and custom industry materials. All matched to the company's visual identity.
                </p>
              </div>

              {/* Visual proof - what you get */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 max-w-2xl mx-auto">
                {[
                  { icon: FileCheck, label: "Tailored Resume" },
                  { icon: BarChart3, label: "Cover Letter" },
                  { icon: Sparkles, label: "Brand Dashboard" },
                  { icon: Zap, label: "90-Day Roadmap" },
                  { icon: BarChart3, label: "Exec Reports" },
                  { icon: Sparkles, label: "Custom Assets" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>

              <Button onClick={() => navigate("/applications/new")} size="lg" className="shadow-lg">
                <Zap className="mr-2 h-4 w-4" /> Create Your First Portfolio
              </Button>

              {/* How it works - simplified */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-xl mx-auto text-left pt-4 border-t border-border">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">1. Paste a job URL</p>
                  <p className="text-xs text-muted-foreground">Or paste the description directly</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">2. AI builds your portfolio</p>
                  <p className="text-xs text-muted-foreground">Multiple branded documents in minutes</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">3. Refine with AI chat</p>
                  <p className="text-xs text-muted-foreground">Vibe Edit any document conversationally</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeView} onValueChange={(v) => {
            const view = v as "active" | "pipeline" | "trash";
            setActiveView(view);
            // Sync URL param for pipeline view
            if (view === "pipeline") {
              setSearchParams({ view: "pipeline" });
            } else {
              searchParams.delete("view");
              setSearchParams(searchParams);
            }
          }}>
            <TabsList>
              <TabsTrigger value="active">Applications</TabsTrigger>
              <TabsTrigger value="pipeline" data-tutorial="pipeline-tab" className="gap-1.5">
                <Kanban className="h-3.5 w-3.5" /> Pipeline
              </TabsTrigger>
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
                  {/* Summary stats + sort */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs gap-1">
                        {applications.length} Total
                      </Badge>
                      <Badge variant="secondary" className="text-xs gap-1 border-green-500/30 text-green-700 dark:text-green-400">
                        {applications.filter((a) => a.status === "complete" || a.generation_status === "complete").length} Complete
                      </Badge>
                      {applications.filter((a) => a.generation_status && !["complete", "error", "idle", "pending"].includes(a.generation_status)).length > 0 && (
                        <Badge variant="secondary" className="text-xs gap-1 border-primary/30 text-primary">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {applications.filter((a) => a.generation_status && !["complete", "error", "idle", "pending"].includes(a.generation_status)).length} In Progress
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={`${sortKey}-${sortDir}`}
                      onValueChange={(v) => {
                        const [key, dir] = v.split("-") as [SortKey, SortDir];
                        setSortKey(key);
                        setSortDir(dir);
                      }}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <ArrowUpDown className="h-3 w-3 mr-1" />
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at-desc">Newest First</SelectItem>
                        <SelectItem value="created_at-asc">Oldest First</SelectItem>
                        <SelectItem value="company_name-asc">Company A-Z</SelectItem>
                        <SelectItem value="company_name-desc">Company Z-A</SelectItem>
                        <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Card grid */}
                  <div data-tutorial="app-table" className="relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {sorted.map((app) => (
                        <ApplicationCommandCard
                          key={app.id}
                          app={app}
                          onDelete={handleSoftDelete}
                          onCopyCoverLetter={(text, e) => handleCopyToClipboard(text, "Cover letter", e)}
                          onCopyHtml={(html, e) => handleCopyToClipboard(html, "Dashboard HTML", e)}
                          onPreview={(id) => { setIsClosing(false); setPreviewId(id); }}
                        />
                      ))}
                    </div>

                    {/* Slide-in preview panel (desktop) */}
                    {previewApp?.dashboard_html && (
                      <div
                        className={`fixed inset-y-0 right-0 z-50 bg-background flex flex-col w-full md:w-[50%] border-l shadow-lg ${
                          isClosing ? "animate-slide-out-right" : "animate-slide-in-right"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50 shrink-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <CompanyIcon iconUrl={previewApp.company_icon_url} companyName={previewApp.company_name} size={18} />
                            <span className="text-sm font-medium text-muted-foreground truncate">
                              {previewApp.company_name} — {previewApp.job_title}
                            </span>
                          </div>
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

            <TabsContent value="pipeline" className="space-y-4">
              <PipelineAnalytics applications={applications} />
              <KanbanBoard applications={applications} onStageChanged={loadApplications} />
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
                      {deletedApps.map((app) => {
                        const days = getDaysRemaining(app.deleted_at);
                        return (
                          <TableRow key={app.id} className="opacity-70">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <CompanyIcon iconUrl={app.company_icon_url} companyName={app.company_name} size={20} />
                                {app.company_name || "Unknown"}
                              </div>
                            </TableCell>
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
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="ghost">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete permanently</TooltipContent>
                                  </Tooltip>
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

      {/* Ghost prompt — applied (10-day trigger, one-time per job) */}
      {staleAppliedApp && (
        <GhostPromptDialog
          open
          stage="applied"
          companyName={staleAppliedApp.company_name || "this company"}
          onMarkGhosted={() => markAsGhosted(staleAppliedApp.id)}
          onDismiss={() => dismissGhostPrompt(staleAppliedApp.id)}
        />
      )}

      {/* Ghost prompt — interviewing (7-day trigger, one-time per job, only if no applied prompt) */}
      {!staleAppliedApp && staleInterviewingApp && (
        <GhostPromptDialog
          open
          stage="interviewing"
          companyName={staleInterviewingApp.company_name || "this company"}
          onMarkGhosted={() => markInterviewAsGhosted(staleInterviewingApp.id)}
          onDismiss={() => dismissInterviewGhostPrompt(staleInterviewingApp.id)}
        />
      )}
    </div>
  );
};


export default Applications;
