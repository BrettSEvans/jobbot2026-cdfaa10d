import { useState, useEffect, useCallback } from "react";
import { saveJobApplication } from "@/lib/api/jobApplication";
import { generateOptimizedResume } from "@/lib/api/resumeGeneration";
import { generateClarityResume } from "@/lib/api/resumeGenerationClarity";
import { supabase } from "@/integrations/supabase/client";
import type { JobApplication, UserResumePickerItem, ToastFn } from "@/types/models";

export type ResumeVariant = "ats" | "clarity";

interface UseResumeEditorOptions {
  id: string | undefined;
  app: JobApplication | null;
  setApp: (fn: (prev: JobApplication | null) => JobApplication | null) => void;
  jobDescription: string;
  companyName: string;
  jobTitle: string;
  userResumes: UserResumePickerItem[];
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
  const [activeVariant, setActiveVariant] = useState<ResumeVariant>("ats");
  const [regenVariant, setRegenVariant] = useState<ResumeVariant>("ats");

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

    const variant = regenVariant;
    const htmlField = variant === "ats" ? "resume_html" : "clarity_resume_html";
    const currentHtml = variant === "ats" ? app?.resume_html : (app as any)?.clarity_resume_html;

    try {
      // Save current resume as revision before regenerating
      if (currentHtml) {
        try {
          await supabase.from("resume_revisions").insert({
            application_id: id,
            html: currentHtml,
            label: `Before ${variant === "ats" ? "ATS Play" : "Clarity"} regeneration`,
            resume_type: variant,
          });
        } catch { /* non-critical */ }
      }

      let resume_html: string;
      if (variant === "ats") {
        const result = await generateOptimizedResume({
          jobDescription,
          resumeText: selected.resume_text,
          missingKeywords: [],
          companyName,
          jobTitle,
          sourceResumeId: selectedResumeId,
        });
        resume_html = result.resume_html;
      } else {
        const result = await generateClarityResume({
          jobDescription,
          resumeText: selected.resume_text,
          companyName,
          jobTitle,
        });
        resume_html = result.resume_html;
      }

      await saveJobApplication({
        id,
        job_url: app!.job_url,
        [htmlField]: resume_html,
        ...(variant === "ats" ? { source_resume_id: selectedResumeId } : {}),
      } as any);

      setApp((prev) => prev ? { ...prev, [htmlField]: resume_html, ...(variant === "ats" ? { source_resume_id: selectedResumeId } : {}) } : prev);
      toast({ title: `${variant === "ats" ? "ATS Play" : "Clarity"} resume regenerated!`, description: `Using "${selected.file_name}" as baseline.` });
      setResumeRevisionTrigger((t) => t + 1);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Regeneration failed", description: message, variant: "destructive" });
    } finally {
      setIsRegeneratingResume(false);
    }
  }, [id, app, selectedResumeId, jobDescription, companyName, jobTitle, userResumes, setApp, toast, setResumeRevisionTrigger, regenVariant]);

  const openRegenDialog = useCallback((variant: ResumeVariant) => {
    setRegenVariant(variant);
    setRegenDialogOpen(true);
  }, []);

  return {
    regenDialogOpen,
    setRegenDialogOpen,
    selectedResumeId,
    setSelectedResumeId,
    isRegeneratingResume,
    editingResume,
    setEditingResume,
    handleRegenerateResume,
    activeVariant,
    setActiveVariant,
    regenVariant,
    openRegenDialog,
  };
}
