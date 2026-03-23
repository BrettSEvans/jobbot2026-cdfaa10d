import { useState, useCallback } from "react";
import { streamTailoredLetter } from "@/lib/api/coverLetter";
import { streamRefineMaterial } from "@/lib/api/jobApplication";
import { saveCoverLetterRevision } from "@/lib/api/coverLetterRevisions";
import type { UserProfileSnapshot, ChatMessage, ToastFn } from "@/types/models";

interface UseCoverLetterEditorOptions {
  id: string | undefined;
  coverLetter: string;
  setCoverLetter: (val: string) => void;
  coverLetterRevisionTrigger: number;
  setCoverLetterRevisionTrigger: (fn: (t: number) => number) => void;
  userProfile: UserProfileSnapshot | null;
  jobDescription: string;
  saveField: (fields: Record<string, unknown>) => Promise<void>;
  toast: ToastFn;
}

export function useCoverLetterEditor({
  id,
  coverLetter,
  setCoverLetter,
  coverLetterRevisionTrigger,
  setCoverLetterRevisionTrigger,
  userProfile,
  jobDescription,
  saveField,
  toast,
}: UseCoverLetterEditorOptions) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [clChatOpen, setClChatOpen] = useState(false);
  const [clChatInput, setClChatInput] = useState("");
  const [clChatHistory, setClChatHistory] = useState<ChatMessage[]>([]);
  const [clRefining, setClRefining] = useState(false);

  const handleRegenerateCoverLetter = useCallback(async () => {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  }, [id, coverLetter, jobDescription, userProfile, setCoverLetter, saveField, toast, setCoverLetterRevisionTrigger]);

  const handleCoverLetterVibeEdit = useCallback(async () => {
    if (!clChatInput.trim() || clRefining || !coverLetter) return;
    const msg = clChatInput.trim();
    setClChatInput("");
    const newHistory = [...clChatHistory, { role: "user", content: msg }];
    setClChatHistory(newHistory);
    setClRefining(true);

    try {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Refinement failed", description: message, variant: "destructive" });
      setClChatHistory((prev) => [...prev, { role: "assistant", content: `❌ Error: ${message}` }]);
    } finally {
      setClRefining(false);
    }
  }, [id, clChatInput, clRefining, coverLetter, clChatHistory, setCoverLetter, saveField, toast, setCoverLetterRevisionTrigger]);

  return {
    isRegenerating,
    clChatOpen,
    setClChatOpen,
    clChatInput,
    setClChatInput,
    clChatHistory,
    clRefining,
    handleRegenerateCoverLetter,
    handleCoverLetterVibeEdit,
  };
}
