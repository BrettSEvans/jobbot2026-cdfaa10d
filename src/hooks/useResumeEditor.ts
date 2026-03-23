import { useState, useEffect, useCallback } from "react";
import { saveJobApplication } from "@/lib/api/jobApplication";
import { generateOptimizedResume } from "@/lib/api/resumeGeneration";
import { supabase } from "@/integrations/supabase/client";
import type { JobApplication, UserResume, ToastFn } from "@/types/models";

interface UseResumeEditorOptions {
  id: string | undefined;
  app: JobApplication | null;
  setApp: (fn: (prev: JobApplication | null) => JobApplication | null) => void;
  jobDescription: string;
  companyName: string;
  jobTitle: string;
  userResumes: UserResume[];
  resumeRevisionTrigger: number;
  setResumeRevisionTrigger: (fn: (t: number) => number) => void;
  toast: ToastFn;
}

export function useResumeEditor({
  id,
  app,
  setApp,
  jobDescription,
  companyName,
  jobTitle,
  userResumes,
  resumeRevisionTrigger,
  setResumeRevisionTrigger,
  toast,
}: UseResumeEditorOptions) {
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [isRegeneratingResume, setIsRegeneratingResume] = useState(false);
  const [editingResume, setEditingResume] = useState(false);

  // Pre-select active resume when dialog opens
  useEffect(() => {
    if (regenDialogOpen && userResumes.length > 0) {
      const active = userResumes.find((r) => r.is_active);
      setSelectedResumeId(active?.id || userResumes[0]?.id || "");
    }
  }, [regenDialogOpen, userResumes]);

  const handleRegenerateResume = useCallback(async () => {
    if (!selectedResumeId || !jobDescription.trim() || !id) return;
    const selected = userResumes.find((r) => r.id === selectedResumeId);
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
  }, [id, app, selectedResumeId, jobDescription, companyName, jobTitle, userResumes, setApp, toast, setResumeRevisionTrigger]);

  return {
    regenDialogOpen,
    setRegenDialogOpen,
    selectedResumeId,
    setSelectedResumeId,
    isRegeneratingResume,
    editingResume,
    setEditingResume,
    handleRegenerateResume,
  };
}
