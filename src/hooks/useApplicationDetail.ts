import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  getJobApplication,
  saveJobApplication,
} from "@/lib/api/jobApplication";
import { parseLlmJsonOutput, assembleDashboardHtml } from "@/lib/dashboard/assembler";
import type { DashboardData } from "@/lib/dashboard/schema";
import { supabase } from "@/integrations/supabase/client";
import { useBackgroundJob } from "@/hooks/useBackgroundJob";
import { useQuery } from "@tanstack/react-query";
import type { JobApplication, UserProfileSnapshot, UserResume, ChatMessage, FabricationChange } from "@/types/models";

export function useApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [app, setApp] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable states
  const [coverLetter, setCoverLetter] = useState("");
  const [editingCoverLetter, setEditingCoverLetter] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [editingJobDescription, setEditingJobDescription] = useState(false);
  const [companyUrl, setCompanyUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [editingMeta, setEditingMeta] = useState(false);

  // Dashboard
  const [dashboardHtml, setDashboardHtml] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Revision triggers
  const [revisionTrigger, setRevisionTrigger] = useState(0);
  const [coverLetterRevisionTrigger, setCoverLetterRevisionTrigger] = useState(0);
  const [resumeRevisionTrigger, setResumeRevisionTrigger] = useState(0);

  // Preview states
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewCoverLetter, setPreviewCoverLetter] = useState<string | null>(null);
  const [previewResumeHtml, setPreviewResumeHtml] = useState<string | null>(null);

  // Background job
  const bgJob = useBackgroundJob(id);
  const isBgGenerating = bgJob && !["complete", "error"].includes(bgJob.status);

  // Prev/next navigation
  const [siblingIds, setSiblingIds] = useState<string[]>([]);
  useEffect(() => {
    supabase.from("job_applications").select("id").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setSiblingIds(data.map((d: any) => d.id));
    });
  }, []);
  const currentIndex = id ? siblingIds.indexOf(id) : -1;
  const prevId = currentIndex > 0 ? siblingIds[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < siblingIds.length - 1 ? siblingIds[currentIndex + 1] : null;

  // User profile + resume text
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileSnapshot | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("resume_text, master_cover_letter, preferred_tone, key_skills, years_experience, first_name, last_name").eq("id", user.id).single()
          .then(({ data }) => {
            setResumeText(data?.resume_text ?? null);
            setUserProfile(data);
          });
      }
    });
  }, []);

  // User resumes for regeneration picker
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

  // Validate UUID
  const isValidUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

  // Re-fetch when background job completes
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

  // Initial load + polling
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

  const saveField = useCallback(async (fields: Record<string, any>) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await saveJobApplication({ id, job_url: app?.job_url, ...fields });
      setApp(updated);
      toast({ title: "Saved", description: "Changes saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [id, app?.job_url, toast]);

  const handleCopy = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  }, [toast]);

  // Fabrication handlers
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

  return {
    id,
    navigate,
    toast,
    app,
    setApp,
    loading,
    saving,
    isValidUuid,
    // Editable fields
    coverLetter,
    setCoverLetter,
    editingCoverLetter,
    setEditingCoverLetter,
    jobDescription,
    setJobDescription,
    editingJobDescription,
    setEditingJobDescription,
    companyUrl,
    setCompanyUrl,
    companyName,
    setCompanyName,
    jobTitle,
    setJobTitle,
    editingMeta,
    setEditingMeta,
    // Dashboard
    dashboardHtml,
    setDashboardHtml,
    dashboardData,
    setDashboardData,
    chatHistory,
    setChatHistory,
    // Revisions
    revisionTrigger,
    setRevisionTrigger,
    coverLetterRevisionTrigger,
    setCoverLetterRevisionTrigger,
    resumeRevisionTrigger,
    setResumeRevisionTrigger,
    // Previews
    previewHtml,
    setPreviewHtml,
    previewCoverLetter,
    setPreviewCoverLetter,
    previewResumeHtml,
    setPreviewResumeHtml,
    // Background
    bgJob,
    isBgGenerating: !!isBgGenerating,
    // Navigation
    prevId,
    nextId,
    // User data
    resumeText,
    userProfile,
    userResumes,
    // Actions
    saveField,
    handleCopy,
    handleAcceptFabrication,
    handleRevertFabrication,
  };
}
