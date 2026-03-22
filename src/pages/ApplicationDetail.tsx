import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getJobApplication,
  saveJobApplication,
  streamDashboardGeneration,
  streamRefineMaterial,
} from "@/lib/api/jobApplication";
import { streamTailoredLetter } from "@/lib/api/coverLetter";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Edit3,
  Check,
  X,
  Loader2,
  FileText,
  Globe,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Download,
  FileDown,
  FolderArchive,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import SaveAsTemplate from "@/components/SaveAsTemplate";
import ResumeHealthPanel from "@/components/ResumeHealthPanel";
import SummaryPreview from "@/components/SummaryPreview";
import JDIntelligencePanel from "@/components/JDIntelligencePanel";
import DashboardRevisions from "@/components/DashboardRevisions";
import CoverLetterRevisions from "@/components/CoverLetterRevisions";
import ResumeRevisions from "@/components/ResumeRevisions";
import InlineHtmlEditor from "@/components/InlineHtmlEditor";
import DynamicMaterialsSection from "@/components/DynamicMaterialsSection";

/** Fit-to-page preview for resume (same approach as materials) */
function ResumePagePreview({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(Math.min(entry.contentRect.width / 816, 1));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Card className="overflow-hidden px-6">
      <div ref={containerRef} className="w-full bg-white" style={{ height: `${1056 * scale}px`, overflow: "hidden" }}>
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          title="Resume Preview"
          style={{
            width: "816px",
            height: "1056px",
            border: "none",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </Card>
  );
}
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { saveDashboardRevision } from "@/lib/api/dashboardRevisions";
import { saveCoverLetterRevision } from "@/lib/api/coverLetterRevisions";
import { useBackgroundJob } from "@/hooks/useBackgroundJob";
import { parseLlmJsonOutput, assembleDashboardHtml, getDashboardZipFiles } from "@/lib/dashboard/assembler";
import type { DashboardData } from "@/lib/dashboard/schema";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { downloadHtmlAsDocx, downloadTextAsDocx } from "@/lib/docxExport";
import { generateOptimizedResume } from "@/lib/api/resumeGeneration";
import type { ExtractedKeyword } from "@/lib/keywordMatcher";
import { useQuery } from "@tanstack/react-query";

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable states
  const [coverLetter, setCoverLetter] = useState("");
  const [editingCoverLetter, setEditingCoverLetter] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [editingJobDescription, setEditingJobDescription] = useState(false);
  const [companyUrl, setCompanyUrl] = useState("");
  const [editingCompanyUrl, setEditingCompanyUrl] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [editingMeta, setEditingMeta] = useState(false);

  // Dashboard
  const [dashboardHtml, setDashboardHtml] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [revisionTrigger, setRevisionTrigger] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewCoverLetter, setPreviewCoverLetter] = useState<string | null>(null);
  const [coverLetterRevisionTrigger, setCoverLetterRevisionTrigger] = useState(0);
  const [previewResumeHtml, setPreviewResumeHtml] = useState<string | null>(null);
  const [resumeRevisionTrigger, setResumeRevisionTrigger] = useState(0);
  const [editingResume, setEditingResume] = useState(false);
  // Cover letter vibe edit
  const [clChatOpen, setClChatOpen] = useState(false);
  const [clChatInput, setClChatInput] = useState("");
  const [clChatHistory, setClChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [clRefining, setClRefining] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bgJob = useBackgroundJob(id);
  const isBgGenerating = bgJob && !["complete", "error"].includes(bgJob.status);

  // Prev/next navigation (Story 2.2)
  const [siblingIds, setSiblingIds] = useState<string[]>([]);
  useEffect(() => {
    supabase.from("job_applications").select("id").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setSiblingIds(data.map((d: any) => d.id));
    });
  }, []);
  const currentIndex = id ? siblingIds.indexOf(id) : -1;
  const prevId = currentIndex > 0 ? siblingIds[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < siblingIds.length - 1 ? siblingIds[currentIndex + 1] : null;

  // Fetch user's resume text and profile for keyword matching
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("resume_text, master_cover_letter, preferred_tone, key_skills, years_experience").eq("id", user.id).single()
          .then(({ data }) => {
            setResumeText(data?.resume_text ?? null);
            setUserProfile(data);
          });
      }
    });
  }, []);

  // Fetch user resumes for regeneration picker
  const { data: userResumes = [] } = useQuery({
    queryKey: ["user_resumes_for_regen"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_resumes")
        .select("id, file_name, is_active, resume_text")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Regenerate resume state
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [isRegeneratingResume, setIsRegeneratingResume] = useState(false);

  // Pre-select active resume when dialog opens
  useEffect(() => {
    if (regenDialogOpen && userResumes.length > 0) {
      const active = userResumes.find((r: any) => r.is_active);
      setSelectedResumeId(active?.id || userResumes[0]?.id || "");
    }
  }, [regenDialogOpen, userResumes]);

  const handleRegenerateResume = async () => {
    if (!selectedResumeId || !jobDescription.trim() || !id) return;
    const selected = userResumes.find((r: any) => r.id === selectedResumeId);
    if (!selected?.resume_text) {
      toast({ title: "No text available", description: "This resume hasn't been extracted yet. Please re-upload it.", variant: "destructive" });
      return;
    }
    setIsRegeneratingResume(true);
    setRegenDialogOpen(false);
    try {
      // Save current resume as revision before regenerating
      if (app?.resume_html) {
        try {
          await supabase.from("resume_revisions").insert({
            application_id: id,
            html: app.resume_html,
            label: "Before regeneration",
          });
        } catch { /* non-critical */ }
      }

      const { resume_html } = await generateOptimizedResume({
        jobDescription,
        resumeText: selected.resume_text,
        missingKeywords: [],
        companyName,
        jobTitle,
        sourceResumeId: selectedResumeId,
      });
      await saveJobApplication({ id, job_url: app.job_url, resume_html, source_resume_id: selectedResumeId } as any);
      setApp((prev: any) => ({ ...prev, resume_html, source_resume_id: selectedResumeId }));
      toast({ title: "Resume regenerated!", description: `Using "${selected.file_name}" as baseline.` });
      setResumeRevisionTrigger((t) => t + 1);
    } catch (e: any) {
      toast({ title: "Regeneration failed", description: e.message, variant: "destructive" });
    } finally {
      setIsRegeneratingResume(false);
    }
  };

  // Re-fetch when background job completes + toast notification
  const prevBgStatus = useRef(bgJob?.status);
  useEffect(() => {
    const prev = prevBgStatus.current;
    prevBgStatus.current = bgJob?.status;

    if (bgJob?.status === "complete" && prev && prev !== "complete" && id && isValidUuid) {
      loadApplication(id);
      toast({
        title: "✨ All assets ready",
        description: "Cover letter and dashboard have finished generating.",
      });
    }
    if (bgJob?.status === "error" && prev && prev !== "error") {
      toast({
        title: "Background generation failed",
        description: bgJob?.progress || "An error occurred while generating assets.",
        variant: "destructive",
      });
    }
  }, [bgJob?.status]);

  // Validate UUID format to avoid DB errors from bots/crawlers
  const isValidUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

  // Story 6.1: Conditional polling — only poll while generation is active
  useEffect(() => {
    if (id && isValidUuid) loadApplication(id);
  }, [id, isValidUuid]);

  useEffect(() => {
    if (!id || !isValidUuid) return;
    const isActive = app?.generation_status && !["idle", "complete", "error"].includes(app.generation_status);
    if (!isActive && !isBgGenerating) return;
    const interval = setInterval(() => {
      if (id) loadApplication(id);
    }, 10000);
    return () => clearInterval(interval);
  }, [id, app?.generation_status, isBgGenerating]);

  const loadApplication = async (appId: string) => {
    try {
      const data = await getJobApplication(appId);
      setApp(data);
      if (!editingCoverLetter) {
        setCoverLetter(data.cover_letter || "");
      }
      setJobDescription(data.job_description_markdown || "");
      setCompanyUrl(data.company_url || "");
      setCompanyName(data.company_name || "");
      setJobTitle(data.job_title || "");
      
      let html = data.dashboard_html || "";
      let parsedDashData = data.dashboard_data as unknown as DashboardData | null;
      
      if (html && !html.trimStart().startsWith("<!") && !html.trimStart().startsWith("<html")) {
        const parsed = parseLlmJsonOutput(html);
        if (parsed) {
          parsedDashData = parsed;
          html = assembleDashboardHtml(parsed);
          try {
            await saveJobApplication({ id: appId, job_url: data.job_url, dashboard_html: html, dashboard_data: parsed });
          } catch { /* non-critical */ }
        }
      }
      
      setDashboardHtml(html);
      setDashboardData(parsedDashData);
      setChatHistory(Array.isArray(data.chat_history) ? data.chat_history as Array<{ role: string; content: string }> : []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveField = async (fields: Record<string, any>) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await saveJobApplication({ id, job_url: app.job_url, ...fields });
      setApp(updated);
      toast({ title: "Saved", description: "Changes saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  // Regenerate cover letter — Story 4.3: pass profile data
  const handleRegenerateCoverLetter = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "No job description", description: "A job description is needed to generate a cover letter.", variant: "destructive" });
      return;
    }
    if (coverLetter.trim() && id) {
      try {
        await saveCoverLetterRevision(id, coverLetter, "Before regeneration");
        setCoverLetterRevisionTrigger((t) => t + 1);
      } catch { /* non-critical */ }
    }
    setIsRegenerating(true);
    setCoverLetter("");
    try {
      let accumulated = "";
      await streamTailoredLetter({
        jobDescription,
        customInstructions: userProfile?.master_cover_letter
          ? `Use this as my master cover letter style reference:\n${userProfile.master_cover_letter}`
          : undefined,
        onDelta: (text) => {
          accumulated += text;
          setCoverLetter(accumulated);
        },
        onDone: () => {},
      });
      await saveField({ cover_letter: accumulated });
      try {
        await saveCoverLetterRevision(id!, accumulated, "Regenerated");
        setCoverLetterRevisionTrigger((t) => t + 1);
      } catch { /* non-critical */ }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Cover letter Vibe Edit handler
  const handleCoverLetterVibeEdit = async () => {
    if (!clChatInput.trim() || clRefining || !coverLetter) return;
    const msg = clChatInput.trim();
    setClChatInput("");
    const newHistory = [...clChatHistory, { role: "user", content: msg }];
    setClChatHistory(newHistory);
    setClRefining(true);

    try {
      // Save revision before refinement
      if (id) {
        try {
          await saveCoverLetterRevision(id, coverLetter, `Before: ${msg.slice(0, 50)}`);
          setCoverLetterRevisionTrigger((t) => t + 1);
        } catch { /* non-critical */ }
      }

      let accumulated = "";
      await streamRefineMaterial({
        currentContent: coverLetter,
        contentType: "text",
        assetName: "Cover Letter",
        userMessage: msg,
        chatHistory: newHistory,
        onDelta: (text) => {
          accumulated += text;
          setCoverLetter(accumulated);
        },
        onDone: () => {},
      });

      if (accumulated && id) {
        await saveField({ cover_letter: accumulated });
        setClChatHistory((prev) => [...prev, { role: "assistant", content: "✅ Changes applied" }]);
      }
    } catch (err: any) {
      toast({ title: "Refinement failed", description: err.message, variant: "destructive" });
      setClChatHistory((prev) => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
    } finally {
      setClRefining(false);
    }
  };

  // Regenerate dashboard
  const handleRegenerateDashboard = async () => {
    if (!jobDescription.trim()) return;
    setIsRegenerating(true);
    setDashboardHtml("");
    setDashboardData(null);
    try {
      let accumulated = "";
      await streamDashboardGeneration({
        jobDescription,
        branding: app?.branding,
        companyName,
        jobTitle,
        competitors: app?.competitors || [],
        customers: app?.customers || [],
        products: app?.products || [],
        onDelta: (text) => { accumulated += text; },
        onDone: () => {
          const parsed = parseLlmJsonOutput(accumulated);
          if (parsed) {
            const html = assembleDashboardHtml(parsed);
            setDashboardHtml(html);
            setDashboardData(parsed);
            accumulated = html;
          } else {
            let clean = accumulated;
            const htmlStart = clean.indexOf("<!DOCTYPE html>");
            const htmlStartAlt = clean.indexOf("<!doctype html>");
            const start = htmlStart !== -1 ? htmlStart : htmlStartAlt;
            if (start > 0) clean = clean.slice(start);
            const htmlEnd = clean.lastIndexOf("</html>");
            if (htmlEnd !== -1) clean = clean.slice(0, htmlEnd + 7);
            setDashboardHtml(clean);
            accumulated = clean;
          }
        },
      });
      const savePayload: Record<string, any> = { dashboard_html: accumulated };
      const parsedForSave = parseLlmJsonOutput(accumulated) || null;
      if (parsedForSave) {
        const html = assembleDashboardHtml(parsedForSave);
        setDashboardHtml(html);
        setDashboardData(parsedForSave);
        savePayload.dashboard_html = html;
        savePayload.dashboard_data = parsedForSave;
        accumulated = html;
      } else if (dashboardData) {
        savePayload.dashboard_data = dashboardData;
      }
      await saveField(savePayload);
      try {
        await saveDashboardRevision(id!, accumulated, "Regenerated");
        setRevisionTrigger((t) => t + 1);
      } catch { /* non-critical */ }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!dashboardData) return;
    const files = getDashboardZipFiles(dashboardData);
    const zip = new JSZip();
    Object.entries(files).forEach(([name, content]) => {
      zip.file(name, content);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(companyName || "dashboard").replace(/\s+/g, "-").toLowerCase()}-dashboard.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Dashboard ZIP with separate files saved." });
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isRefining) return;
    const msg = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    setIsRefining(true);

    try {
      await backgroundGenerator.startRefinement({
        applicationId: id!,
        currentHtml: dashboardHtml,
        currentDashboardData: dashboardData || undefined,
        userMessage: msg,
        chatHistory: newHistory,
        jobUrl: app.job_url,
      });
      try {
        await saveDashboardRevision(id!, dashboardHtml, `Before: ${msg.slice(0, 50)}`);
        setRevisionTrigger((t) => t + 1);
      } catch { /* non-critical */ }
      toast({ title: "Refining", description: "Dashboard refinement started. It will continue even if you navigate away." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setChatHistory((prev) => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
    } finally {
      setIsRefining(false);
    }
  };

  // Story 4.2: Fabrication review persistence
  const handleAcceptFabrication = useCallback((change: any) => {
    const text = change?.tailored_text || change?.baseline_text || "change";
    toast({ title: "Accepted", description: `Kept: "${text.slice(0, 50)}…"` });
  }, [toast]);

  const handleRevertFabrication = useCallback(async (change: any) => {
    if (!app?.resume_html || !id) return;
    const tailored = change?.tailored_text;
    const baseline = change?.baseline_text;
    if (!tailored || !baseline) {
      toast({ title: "Revert failed", description: "Missing baseline or tailored text for this change.", variant: "destructive" });
      return;
    }
    const updatedHtml = app.resume_html.replace(tailored, baseline);
    try {
      await saveJobApplication({ id, job_url: app.job_url, resume_html: updatedHtml } as any);
      setApp((prev: any) => ({ ...prev, resume_html: updatedHtml }));
      toast({ title: "Reverted", description: `Restored baseline for: "${baseline.slice(0, 50)}…"` });
    } catch (err: any) {
      toast({ title: "Revert failed", description: err.message, variant: "destructive" });
    }
  }, [app, id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!app || !isValidUuid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Application not found.</p>
        <Button variant="outline" onClick={() => navigate("/applications")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header with prev/next nav (Story 2.2) */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {companyName || "Unknown Company"} — {jobTitle || "Unknown Role"}
              </h1>
              <p className="text-xs text-muted-foreground">{app.job_url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2" data-tour="prev-next">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!prevId}
              onClick={() => prevId && navigate(`/applications/${prevId}`)}
              title="Previous application"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!nextId}
              onClick={() => nextId && navigate(`/applications/${nextId}`)}
              title="Next application"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Badge variant={app.status === "complete" ? "default" : "secondary"}>{app.status}</Badge>
          </div>
        </div>

        {/* Story 2.1: Restructured tabs — Resume first, split JD tab */}
        <Tabs defaultValue="resume" className="space-y-4">
          <TabsList className="w-full justify-start flex-wrap">
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="cover-letter" className="flex items-center gap-1.5">
              Cover Letter
              {app?.generation_status && !["idle", "complete", "error"].includes(app.generation_status) && !app?.cover_letter && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </TabsTrigger>
            <TabsTrigger value="jd-analysis">JD Analysis</TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-1.5">
              Materials
              {app?.generation_status && !["idle", "complete", "error"].includes(app.generation_status) && !app?.dashboard_html && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Story 4.1: Resume Tab */}
          <TabsContent value="resume" className="space-y-4">
            {app?.resume_html ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={editingResume ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => { setEditingResume(true); setPreviewResumeHtml(null); }}
                    disabled={editingResume}
                  >
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const iframe = document.createElement("iframe");
                      iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:none;";
                      document.body.appendChild(iframe);
                      const doc = iframe.contentDocument || iframe.contentWindow?.document;
                      if (!doc) {
                        toast({ title: "Error", description: "Could not open print frame.", variant: "destructive" });
                        document.body.removeChild(iframe);
                        return;
                      }
                      const printStyles = `<style>@page{size:letter;margin:0.5in}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>`;
                      doc.open();
                      doc.write(app.resume_html.replace("</head>", printStyles + "</head>"));
                      doc.close();
                      const triggerPrint = () => {
                        try { iframe.contentWindow?.print(); } catch (_) {}
                        setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
                      };
                      iframe.onload = () => setTimeout(triggerPrint, 400);
                      setTimeout(triggerPrint, 1500);
                    }}
                  >
                    <FileDown className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const name = `resume-${(companyName || "document").replace(/\s+/g, "-").toLowerCase()}-${(jobTitle || "").replace(/\s+/g, "-").toLowerCase()}`;
                      downloadHtmlAsDocx(app.resume_html, `${name}.docx`);
                      toast({ title: "Downloading", description: "Resume DOCX file is being prepared." });
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download DOCX
                  </Button>

                  {/* Regenerate Resume */}
                  <Dialog open={regenDialogOpen} onOpenChange={setRegenDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isRegeneratingResume}
                      >
                        {isRegeneratingResume ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {isRegeneratingResume ? "Regenerating…" : "Regenerate"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Regenerate Resume</DialogTitle>
                        <DialogDescription>
                          Choose which uploaded resume to use as the baseline for regeneration.
                        </DialogDescription>
                      </DialogHeader>
                      {userResumes.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">
                          No resumes uploaded. Go to your Profile to upload a resume first.
                        </p>
                      ) : (
                        <div className="space-y-3 py-2">
                          <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a resume" />
                            </SelectTrigger>
                            <SelectContent>
                              {userResumes.map((r: any) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.file_name}
                                  {r.is_active ? " (Primary)" : ""}
                                  {!r.resume_text ? " — not extracted" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedResumeId && !userResumes.find((r: any) => r.id === selectedResumeId)?.resume_text && (
                            <p className="text-xs text-destructive">
                              This resume's text hasn't been extracted yet. Re-upload it from your Profile.
                            </p>
                          )}
                        </div>
                      )}
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setRegenDialogOpen(false)}>Cancel</Button>
                        <Button
                          onClick={handleRegenerateResume}
                          disabled={!selectedResumeId || !userResumes.find((r: any) => r.id === selectedResumeId)?.resume_text}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Resume preview / editor */}
                {editingResume ? (
                  <InlineHtmlEditor
                    html={app.resume_html}
                    height="60vh"
                    onSave={async (newHtml) => {
                      // Save current as revision
                      if (app.resume_html) {
                        try {
                          await supabase.from("resume_revisions").insert({
                            application_id: id!,
                            html: app.resume_html,
                            label: "Before manual edit",
                            revision_number: Date.now(),
                          });
                        } catch (_) {}
                      }
                      await saveJobApplication({ id: id!, job_url: app.job_url, resume_html: newHtml } as any);
                      setApp((prev: any) => ({ ...prev, resume_html: newHtml }));
                      setEditingResume(false);
                      setResumeRevisionTrigger((t) => t + 1);
                      toast({ title: "Resume saved" });
                    }}
                    onCancel={() => setEditingResume(false)}
                  />
                ) : (
                  <ResumePagePreview html={previewResumeHtml || app.resume_html} />
                )}

                {/* Resume Revision History */}
                {id && (
                  <ResumeRevisions
                    applicationId={id}
                    currentHtml={app.resume_html}
                    onPreviewRevision={setPreviewResumeHtml}
                    refreshTrigger={resumeRevisionTrigger}
                  />
                )}

                {/* Unified Resume Health Panel */}
                {jobDescription && (
                  <ResumeHealthPanel
                    resumeHtml={app.resume_html}
                    jobDescription={jobDescription}
                    resumeText={resumeText}
                    companyName={companyName}
                    jobTitle={jobTitle}
                    onOptimize={async (missingKeywords: ExtractedKeyword[], userPrompt?: string) => {
                      if (!resumeText) {
                        toast({ title: "No resume found", description: "Upload a resume in your Profile first.", variant: "destructive" });
                        return;
                      }
                      const kwList = missingKeywords.map(k => k.keyword).join(", ");
                      toast({ title: "Optimizing resume…", description: `Injecting keywords: ${kwList}` });
                      try {
                        const { resume_html } = await generateOptimizedResume({
                          jobDescription,
                          resumeText,
                          missingKeywords,
                          userPrompt,
                          companyName,
                          jobTitle,
                        });
                        await saveJobApplication({ id: id!, job_url: app.job_url, resume_html } as any);
                        setApp((prev: any) => ({ ...prev, resume_html }));
                        toast({ title: "Resume optimized!", description: `${missingKeywords.length} keywords injected.` });
                      } catch (e: any) {
                        toast({ title: "Optimization failed", description: e.message, variant: "destructive" });
                      }
                    }}
                    onApplyBulletFix={(original, replacement) => {
                      const updatedHtml = app.resume_html.replace(original, replacement);
                      saveJobApplication({ id: id!, job_url: app.job_url, resume_html: updatedHtml } as any)
                        .then(() => setApp((prev: any) => ({ ...prev, resume_html: updatedHtml })));
                      toast({ title: "Bullet updated", description: `Replaced: "${original.slice(0, 40)}…"` });
                    }}
                    onAcceptFabrication={handleAcceptFabrication}
                    onRevertFabrication={handleRevertFabrication}
                  />
                )}
              </>
            ) : isBgGenerating ? (
              <Card>
                <CardContent className="py-12 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground font-medium">{bgJob?.progress || "Generating resume..."}</p>
                  <p className="text-xs text-muted-foreground">You can navigate away — generation continues in the background.</p>
                </CardContent>
              </Card>
            ) : (
              /* Story 1.1: Empty state */
              <Card>
                <CardContent className="py-12 text-center space-y-3">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h3 className="font-medium">No resume generated yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {!resumeText
                      ? "Add your resume text in your Profile first, then use Keyword Analysis to generate an optimized resume."
                      : !jobDescription
                      ? "Add a job description in the JD Analysis tab, then use Keyword Analysis to generate an optimized resume."
                      : "Use Keyword Analysis in this tab to generate an optimized, keyword-injected resume."}
                  </p>
                  {!resumeText && (
                    <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
                      Go to Profile
                    </Button>
                  )}
                  {resumeText && jobDescription && (
                    <ResumeHealthPanel
                      resumeHtml=""
                      jobDescription={jobDescription}
                      resumeText={resumeText}
                      companyName={companyName}
                      jobTitle={jobTitle}
                      onOptimize={async (missingKeywords: ExtractedKeyword[], userPrompt?: string) => {
                        const kwList = missingKeywords.map(k => k.keyword).join(", ");
                        toast({ title: "Optimizing resume…", description: `Injecting keywords: ${kwList}` });
                        try {
                          const { resume_html } = await generateOptimizedResume({
                            jobDescription, resumeText, missingKeywords, userPrompt, companyName, jobTitle,
                          });
                          await saveJobApplication({ id: id!, job_url: app.job_url, resume_html } as any);
                          setApp((prev: any) => ({ ...prev, resume_html }));
                          toast({ title: "Resume optimized!", description: `${missingKeywords.length} keywords injected.` });
                        } catch (e: any) {
                          toast({ title: "Optimization failed", description: e.message, variant: "destructive" });
                        }
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Cover Letter Tab */}
          <TabsContent value="cover-letter" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {coverLetter && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(coverLetter, "Cover letter")}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      if (!printWindow) return;
                      const fullName = userProfile
                        ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") || "Cover Letter"
                        : "Cover Letter";
                      const htmlContent = `<!DOCTYPE html><html><head><title>${fullName} - Cover Letter</title><style>
                        @page { size: letter; margin: 1in 1in 0.75in 1in; }
                        body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.6; color: #111; margin: 0; padding: 0; }
                        .content { white-space: pre-wrap; }
                      </style></head><body><div class="content">${(previewCoverLetter || coverLetter).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div></body></html>`;
                      printWindow.document.write(htmlContent);
                      printWindow.document.close();
                      printWindow.onload = () => { printWindow.print(); };
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const name = `cover-letter-${(companyName || "document").replace(/\s+/g, "-").toLowerCase()}-${(jobTitle || "").replace(/\s+/g, "-").toLowerCase()}`;
                      downloadTextAsDocx(previewCoverLetter || coverLetter, `${name}.docx`);
                      toast({ title: "Downloading", description: "Cover letter DOCX file is being prepared." });
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download DOCX
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditingCoverLetter(!editingCoverLetter)}>
                <Edit3 className="mr-2 h-4 w-4" /> {editingCoverLetter ? "Cancel Edit" : "Edit"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerateCoverLetter} disabled={isRegenerating}>
                {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Regenerate
              </Button>
              {coverLetter && (
                <Button variant="outline" size="sm" onClick={() => setClChatOpen(!clChatOpen)}>
                  <Edit3 className="mr-2 h-4 w-4" /> {clChatOpen ? "Hide Chat" : "Vibe Edit"}
                </Button>
              )}
            </div>

            {/* Cover Letter Vibe Edit Chat */}
            {clChatOpen && coverLetter && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {clChatHistory.map((msg, i) => (
                      <div key={i} className={`text-sm p-2 rounded ${msg.role === "user" ? "bg-primary/10 text-right" : "bg-muted"}`}>{msg.content}</div>
                    ))}
                    {clRefining && <div className="text-sm p-2 rounded bg-muted flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Refining...</div>}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder='e.g. "Make the opening more compelling" or "Add more technical depth"'
                      value={clChatInput}
                      onChange={(e) => setClChatInput(e.target.value)}
                      rows={2}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCoverLetterVibeEdit(); } }}
                    />
                    <Button onClick={handleCoverLetterVibeEdit} disabled={!clChatInput.trim() || clRefining} className="self-end">Send</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {id && coverLetter && (
              <CoverLetterRevisions
                applicationId={id}
                currentCoverLetter={coverLetter}
                onPreviewRevision={(text) => setPreviewCoverLetter(text === coverLetter ? null : text)}
                refreshTrigger={coverLetterRevisionTrigger}
              />
            )}

            {previewCoverLetter && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">Previewing older version</Badge>
                <Button variant="ghost" size="sm" onClick={() => setPreviewCoverLetter(null)}>
                  Back to current
                </Button>
              </div>
            )}

            <Card>
              <CardContent className="pt-6">
                {editingCoverLetter ? (
                  <div className="space-y-3">
                    <div className="flex gap-1 border-b border-border pb-2 mb-2">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold" onClick={() => document.execCommand("bold")}>B</Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs italic" onClick={() => document.execCommand("italic")}>I</Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs underline" onClick={() => document.execCommand("underline")}>U</Button>
                    </div>
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      className="min-h-[400px] p-4 text-sm leading-relaxed border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring whitespace-pre-wrap"
                      onBlur={(e) => setCoverLetter(e.currentTarget.innerText)}
                      dangerouslySetInnerHTML={{ __html: coverLetter.replace(/\n/g, "<br>") }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          saveField({ cover_letter: coverLetter });
                          setEditingCoverLetter(false);
                        }}
                        disabled={saving}
                      >
                        <Check className="mr-2 h-4 w-4" /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCoverLetter(app.cover_letter || "");
                          setEditingCoverLetter(false);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" /> Discard
                      </Button>
                    </div>
                  </div>
                ) : (previewCoverLetter || coverLetter) ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{previewCoverLetter || coverLetter}</div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No cover letter yet.</p>
                    <Button onClick={handleRegenerateCoverLetter} disabled={isRegenerating}>
                      <Sparkles className="mr-2 h-4 w-4" /> Generate Cover Letter
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Story 2.1: JD Analysis Tab (split from old Job Description tab) */}
          <TabsContent value="jd-analysis" className="space-y-4">
            {/* Collapsible Job & Company URL fields */}
            <Collapsible defaultOpen={false}>
              <Card className="border-dashed">
                <CardContent className="pt-3 pb-3">
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Job &amp; Company URLs
                    </span>
                    <ChevronRightIcon className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Job URL / Pasted Text</label>
                      <Input
                        value={app?.job_url || ""}
                        readOnly
                        className="text-sm bg-muted/40"
                        placeholder="No job URL"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Company URL</label>
                      <div className="flex gap-2">
                        <Input
                          value={companyUrl}
                          onChange={(e) => setCompanyUrl(e.target.value)}
                          className="text-sm"
                          placeholder="https://company.com"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() => saveField({ company_url: companyUrl })}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
            {/* Story 1.1: Empty state for JD tools */}
            {!jobDescription ? (
              <Card>
                <CardContent className="py-12 text-center space-y-3">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h3 className="font-medium">No job description available</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Add a job description below to unlock JD Intelligence, keyword analysis, and summary preview tools.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setEditingJobDescription(true)}>
                    <Edit3 className="mr-2 h-4 w-4" /> Add Job Description
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <JDIntelligencePanel
                  jobDescription={jobDescription}
                  companyName={companyName}
                  jdIntelligence={app?.jd_intelligence}
                  onParsed={async (intelligence) => {
                    try {
                      await saveJobApplication({ id: id!, job_url: app.job_url, jd_intelligence: intelligence } as any);
                      setApp((prev: any) => ({ ...prev, jd_intelligence: intelligence }));
                    } catch (e) {
                      console.warn("Failed to save JD intelligence:", e);
                    }
                  }}
                />

                <SummaryPreview
                  jobDescription={jobDescription}
                  resumeText={resumeText}
                  companyName={companyName}
                  jobTitle={jobTitle}
                  onApprove={(summary) => {
                    toast({ title: "Summary approved", description: "Ready for full resume generation with your summary." });
                  }}
                />
              </>
            )}

            {/* JD text editor */}
            <div className="flex flex-wrap gap-2">
              {jobDescription && (
                <Button variant="outline" size="sm" onClick={() => handleCopy(jobDescription, "Job description")}>
                  <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditingJobDescription(!editingJobDescription)}>
                <Edit3 className="mr-2 h-4 w-4" /> {editingJobDescription ? "Cancel Edit" : "Edit"}
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                {editingJobDescription ? (
                  <div className="space-y-3">
                    <Textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={20}
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          saveField({ job_description_markdown: jobDescription });
                          setEditingJobDescription(false);
                        }}
                        disabled={saving}
                      >
                        <Check className="mr-2 h-4 w-4" /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setJobDescription(app.job_description_markdown || "");
                          setEditingJobDescription(false);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" /> Discard
                      </Button>
                    </div>
                  </div>
                ) : jobDescription ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
                    {jobDescription}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No job description saved.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab — Dynamic assets from generated_assets + Dashboard */}
          <TabsContent value="materials" className="space-y-4">
            <DynamicMaterialsSection
              applicationId={id!}
              app={app}
              jobDescription={jobDescription}
              companyName={companyName}
              jobTitle={jobTitle}
              isBgGenerating={!!isBgGenerating}
              bgJob={bgJob}
              dashboardHtml={dashboardHtml}
              dashboardData={dashboardData}
              setDashboardHtml={setDashboardHtml}
              setDashboardData={setDashboardData}
              chatOpen={chatOpen}
              setChatOpen={setChatOpen}
              chatInput={chatInput}
              setChatInput={setChatInput}
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              isRefining={isRefining}
              setIsRefining={setIsRefining}
              isRegenerating={isRegenerating}
              setIsRegenerating={setIsRegenerating}
              previewHtml={previewHtml}
              setPreviewHtml={setPreviewHtml}
              revisionTrigger={revisionTrigger}
              setRevisionTrigger={setRevisionTrigger}
              iframeRef={iframeRef}
              handleRegenerateDashboard={handleRegenerateDashboard}
              handleSendChat={handleSendChat}
              handleDownloadZip={handleDownloadZip}
              saveField={saveField}
              toast={toast}
            />
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Application Info</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setEditingMeta(!editingMeta)}>
                    <Edit3 className="mr-2 h-4 w-4" /> {editingMeta ? "Cancel" : "Edit"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingMeta ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Job Title</label>
                      <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Company URL</label>
                      <Input value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          saveField({ company_name: companyName, job_title: jobTitle, company_url: companyUrl });
                          setEditingMeta(false);
                        }}
                        disabled={saving}
                      >
                        <Check className="mr-2 h-4 w-4" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setCompanyName(app.company_name || "");
                        setJobTitle(app.job_title || "");
                        setCompanyUrl(app.company_url || "");
                        setEditingMeta(false);
                      }}>
                        <X className="mr-2 h-4 w-4" /> Discard
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <InfoRow label="Company" value={companyName} />
                    <InfoRow label="Job Title" value={jobTitle} />
                    <InfoRow label="Job URL" value={app.job_url} isLink />
                    <InfoRow label="Company URL" value={companyUrl} isLink />
                    <InfoRow label="Status" value={app.status} />
                    <InfoRow label="Created" value={new Date(app.created_at).toLocaleDateString()} />
                    <InfoRow label="Updated" value={new Date(app.updated_at).toLocaleDateString()} />
                  </div>
                )}

                {/* Collapsible Job Description */}
                <Collapsible className="mt-4 border-t pt-3">
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Job Description
                    </span>
                    <ChevronRightIcon className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    <Textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                      placeholder="Paste or type the job description here…"
                    />
                    <Button
                      size="sm"
                      disabled={saving}
                      onClick={() => saveField({ job_description_markdown: jobDescription })}
                    >
                      <Check className="mr-2 h-3.5 w-3.5" /> Save
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Intelligence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <TagSection label="Products" items={app.products as string[] | null} />
                <TagSection label="Competitors" items={app.competitors as string[] | null} />
                <TagSection label="Customers" items={app.customers as string[] | null} />
                {app.branding && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Branding:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">✓ Captured</Badge>
                      {app.branding.colors && Object.entries(app.branding.colors).slice(0, 6).map(([key, val]) => (
                        <div
                          key={key}
                          className="h-5 w-5 rounded-full border"
                          style={{ backgroundColor: val as string }}
                          title={`${key}: ${val}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function InfoRow({ label, value, isLink }: { label: string; value?: string | null; isLink?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 truncate max-w-[300px]">
          {value} <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      ) : (
        <span className="text-sm">{value || "—"}</span>
      )}
    </div>
  );
}

function TagSection({ label, items }: { label: string; items: string[] | null }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div>
      <span className="text-sm font-medium text-muted-foreground">{label}:</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {list.length > 0 ? list.map((item, i) => (
          <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
        )) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </div>
    </div>
  );
}

export default ApplicationDetail;
