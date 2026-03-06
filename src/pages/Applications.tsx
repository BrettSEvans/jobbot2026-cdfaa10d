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
import { updatePipelineStage } from "@/lib/pipelineStages";
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
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { useActiveJobCount } from "@/hooks/useBackgroundJob";
import BatchModePrompt from "@/components/BatchModePrompt";
import ImpersonationNotice from "@/components/ImpersonationNotice";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useTutorial } from "@/hooks/useTutorial";
import { BookOpen } from "lucide-react";
import { BRAND } from "@/lib/branding";
import { ImageIcon } from "lucide-react";
type SortKey = "company_name" | "job_title" | "status" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";
const Applications = () => {
  const { activePersona, isImpersonating } = useImpersonation();
  const { showTutorial, startTutorial } = useTutorial();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [deletedApps, setDeletedApps] = useState<any[]>([]);
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

  // 48-hour bookmarked prompt: find oldest bookmarked app that's been sitting > 48h and not dismissed
  const staleBookmarkedApp = useMemo(() => {
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const now = Date.now();
    const dismissed: string[] = JSON.parse(localStorage.getItem('dismissed_bookmarked_prompts') || '[]');
    return applications
      .filter((app) => {
        const stage = (app as any).pipeline_stage || 'bookmarked';
        if (stage !== 'bookmarked') return false;
        if (dismissed.includes(app.id)) return false;
        const changedAt = (app as any).stage_changed_at || app.created_at;
        return now - new Date(changedAt).getTime() > FORTY_EIGHT_HOURS;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] || null;
  }, [applications]);

  // 10-day ghosted prompt for applied apps
  const staleAppliedApp = useMemo(() => {
    const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const dismissed: string[] = JSON.parse(localStorage.getItem('dismissed_ghost_prompts') || '[]');
    return applications
      .filter((app) => {
        const stage = (app as any).pipeline_stage || 'bookmarked';
        if (stage !== 'applied') return false;
        if (dismissed.includes(app.id)) return false;
        const changedAt = (app as any).stage_changed_at || app.created_at;
        return now - new Date(changedAt).getTime() > TEN_DAYS;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] || null;
  }, [applications]);

  // 7-day ghosted prompt for interviewing apps
  const staleInterviewingApp = useMemo(() => {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const dismissed: string[] = JSON.parse(localStorage.getItem('dismissed_ghost_interview_prompts') || '[]');
    return applications
      .filter((app) => {
        const stage = (app as any).pipeline_stage || 'bookmarked';
        if (stage !== 'interviewing') return false;
        if (dismissed.includes(app.id)) return false;
        const changedAt = (app as any).stage_changed_at || app.created_at;
        return now - new Date(changedAt).getTime() > SEVEN_DAYS;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] || null;
  }, [applications]);

  const dismissBookmarkedPrompt = useCallback((appId: string) => {
    const dismissed: string[] = JSON.parse(localStorage.getItem('dismissed_bookmarked_prompts') || '[]');
    dismissed.push(appId);
    localStorage.setItem('dismissed_bookmarked_prompts', JSON.stringify(dismissed));
    setApplications((prev) => [...prev]);
  }, []);

  const dismissGhostPrompt = useCallback((appId: string) => {
    const dismissed: string[] = JSON.parse(localStorage.getItem('dismissed_ghost_prompts') || '[]');
    dismissed.push(appId);
    localStorage.setItem('dismissed_ghost_prompts', JSON.stringify(dismissed));
    setApplications((prev) => [...prev]);
  }, []);

  const dismissInterviewGhostPrompt = useCallback((appId: string) => {
    const dismissed: string[] = JSON.parse(localStorage.getItem('dismissed_ghost_interview_prompts') || '[]');
    dismissed.push(appId);
    localStorage.setItem('dismissed_ghost_interview_prompts', JSON.stringify(dismissed));
    setApplications((prev) => [...prev]);
  }, []);

  const markAsGhosted = useCallback(async (appId: string) => {
    try {
      await updatePipelineStage(appId, 'applied', 'ghosted');
      dismissGhostPrompt(appId);
      loadApplications();
      toast({ title: "Marked as ghosted", description: "Application moved to Ghosted stage." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }, [dismissGhostPrompt, toast]);

  const markInterviewAsGhosted = useCallback(async (appId: string) => {
    try {
      await updatePipelineStage(appId, 'interviewing', 'ghosted');
      dismissInterviewGhostPrompt(appId);
      loadApplications();
      toast({ title: "Marked as ghosted", description: "Application moved to Ghosted stage." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }, [dismissInterviewGhostPrompt, toast]);

  // Check if any apps are missing icons
  const needsBackfill = useMemo(
    () => applications.some((a) => a.company_name && !(a as any).company_icon_url),
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
            <h1 className="text-2xl font-bold tracking-tight">Job Applications</h1>
            <p className="text-muted-foreground text-sm">Your saved applications and dashboards</p>
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
          <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
              <p className="text-foreground">
                Have you applied to <strong>{staleBookmarkedApp.company_name || 'this job'}</strong>? It's been bookmarked for over 48 hours.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => dismissBookmarkedPrompt(staleBookmarkedApp.id)}>
                Dismiss
              </Button>
              <Button size="sm" onClick={() => navigate(`/applications/${staleBookmarkedApp.id}`)}>
                Update Status
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="hidden md:table-cell">Updated</TableHead>
                  <TableHead className="hidden md:table-cell">Assets</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
                    <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="hidden md:table-cell"><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="hidden md:table-cell"><div className="flex gap-1">{Array.from({ length: 6 }).map((_, j) => <div key={j} className="h-2.5 w-2.5 rounded-full bg-muted animate-pulse" />)}</div></TableCell>
                    <TableCell><div className="h-8 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                <h3 className="text-lg font-heading font-semibold mb-2">Welcome to {BRAND.name}</h3>
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
                  <div data-tutorial="app-table" className="relative overflow-hidden rounded-md border min-h-[400px]">
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
                          <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("updated_at")}>
                            <div className="flex items-center">Updated <SortIcon col="updated_at" /></div>
                          </TableHead>
                          <TableHead className="hidden md:table-cell">Assets</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((app) => (
                          <TableRow
                            key={app.id}
                            className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            onClick={() => navigate(`/applications/${app.id}`)}
                            tabIndex={0}
                            role="link"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigate(`/applications/${app.id}`);
                              }
                            }}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <CompanyIcon iconUrl={(app as any).company_icon_url} companyName={app.company_name} size={20} />
                                {app.company_name || "Unknown"}
                              </div>
                            </TableCell>
                            <TableCell>{app.job_title || "Unknown"}</TableCell>
                            <TableCell>
                              <ApplicationStatusCell appId={app.id} dbStatus={app.status} generationStatus={app.generation_status} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(app.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                              {new Date(app.updated_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <AssetDots app={app} />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                                {app.cover_letter && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="sm" variant="ghost" aria-label="Copy cover letter" onClick={(e) => handleCopyCoverLetter(app.cover_letter, e)}>
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
                                          aria-label="Preview dashboard"
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
                                        <Button size="sm" variant="ghost" aria-label="Copy dashboard HTML" onClick={(e) => handleCopyHtml(app.dashboard_html, e)}>
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
                                        <Button size="sm" variant="ghost" aria-label="Move to trash">
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
                          <div className="flex items-center gap-2 min-w-0">
                            <CompanyIcon iconUrl={(previewApp as any).company_icon_url} companyName={previewApp.company_name} size={18} />
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
                      {deletedApps.map((app: any) => {
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

      {/* Ghost prompt dialog — PREVIEW MODE: forced open for approval */}
      <GhostPromptDialog
        open={true}
        companyName="Acme Corp"
        onMarkGhosted={() => {}}
        onDismiss={() => {}}
      />
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
