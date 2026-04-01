import { useState, useCallback, useRef } from "react";
import {
  streamDashboardGeneration,
  saveJobApplication,
} from "@/lib/api/jobApplication";
import { parseLlmJsonOutput, assembleDashboardHtml, extractHtmlDocument, getDashboardZipFiles } from "@/lib/dashboard/assembler";
import type { DashboardData } from "@/lib/dashboard/schema";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { saveDashboardRevision } from "@/lib/api/dashboardRevisions";
import JSZip from "jszip";
import type { JobApplication, ChatMessage, ToastFn } from "@/types/models";

interface UseDashboardEditorOptions {
  id: string | undefined;
  app: JobApplication | null;
  jobDescription: string;
  companyName: string;
  jobTitle: string;
  dashboardHtml: string;
  setDashboardHtml: (val: string) => void;
  dashboardData: DashboardData | null;
  setDashboardData: (val: DashboardData | null) => void;
  chatHistory: ChatMessage[];
  setChatHistory: (val: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  revisionTrigger: number;
  setRevisionTrigger: (fn: (t: number) => number) => void;
  saveField: (fields: Record<string, unknown>) => Promise<void>;
  toast: ToastFn;
}

export function useDashboardEditor({
  id,
  app,
  jobDescription,
  companyName,
  jobTitle,
  dashboardHtml,
  setDashboardHtml,
  dashboardData,
  setDashboardData,
  chatHistory,
  setChatHistory,
  revisionTrigger,
  setRevisionTrigger,
  saveField,
  toast,
}: UseDashboardEditorOptions) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRegenerateDashboard = useCallback(async () => {
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
        competitors: (app?.competitors as unknown as string[]) || [],
        customers: (app?.customers as unknown as string[]) || [],
        products: (app?.products as unknown as string[]) || [],
        onDelta: (text) => { accumulated += text; },
        onDone: () => {
          const parsed = parseLlmJsonOutput(accumulated);
          if (parsed) {
            const html = assembleDashboardHtml(parsed);
            setDashboardHtml(html);
            setDashboardData(parsed);
            accumulated = html;
          } else {
            const clean = extractHtmlDocument(accumulated);
            if (clean) {
              setDashboardHtml(clean);
              accumulated = clean;
            } else {
              // Raw JSON/text that couldn't be parsed — show error, not code
              console.error("[Dashboard] LLM output could not be parsed as JSON or HTML. Length:", accumulated.length);
              setDashboardHtml("");
              toast({ title: "Dashboard generation failed", description: "The AI response could not be parsed. Please try regenerating.", variant: "destructive" });
            }
          }
        },
      });
      const savePayload: Record<string, unknown> = {};
      const parsedForSave = parseLlmJsonOutput(accumulated) || null;
      if (parsedForSave) {
        const html = assembleDashboardHtml(parsedForSave);
        setDashboardHtml(html);
        setDashboardData(parsedForSave);
        savePayload.dashboard_html = html;
        savePayload.dashboard_data = parsedForSave;
        accumulated = html;
      } else {
        const extractedHtml = extractHtmlDocument(accumulated);
        if (extractedHtml) {
          savePayload.dashboard_html = extractedHtml;
          accumulated = extractedHtml;
        }
      }

      if (!savePayload.dashboard_html && dashboardData && dashboardHtml) {
        savePayload.dashboard_html = dashboardHtml;
        savePayload.dashboard_data = dashboardData;
        accumulated = dashboardHtml;
      }
      // Only save if we have valid content
      if (accumulated) {
        await saveField(savePayload);
      }
      try {
        await saveDashboardRevision(id!, accumulated, "Regenerated");
        setRevisionTrigger((t) => t + 1);
      } catch { /* non-critical */ }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  }, [id, app, jobDescription, companyName, jobTitle, dashboardData, setDashboardHtml, setDashboardData, saveField, toast, setRevisionTrigger]);

  const handleSendChat = useCallback(async () => {
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
        onComplete: (newHtml, newData, updatedChatHistory) => {
          setDashboardHtml(newHtml);
          if (newData) setDashboardData(newData);
          setChatHistory(updatedChatHistory as ChatMessage[]);
          // Save a post-refinement revision
          saveDashboardRevision(id!, newHtml, `After: ${msg.slice(0, 50)}`).then(() => {
            setRevisionTrigger((t) => t + 1);
          }).catch(() => { /* non-critical */ });
        },
      });
      try {
        await saveDashboardRevision(id!, dashboardHtml, `Before: ${msg.slice(0, 50)}`);
        setRevisionTrigger((t) => t + 1);
      } catch { /* non-critical */ }
      toast({ title: "Refining", description: "Dashboard refinement started. It will continue even if you navigate away." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
      setChatHistory((prev) => [...prev, { role: "assistant", content: `❌ Error: ${message}` }]);
    } finally {
      setIsRefining(false);
    }
  }, [id, app, chatInput, isRefining, chatHistory, dashboardHtml, dashboardData, setChatHistory, saveField, toast, setRevisionTrigger]);

  const handleDownloadZip = useCallback(async () => {
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
  }, [dashboardData, companyName, toast]);

  return {
    chatOpen,
    setChatOpen,
    chatInput,
    setChatInput,
    isRefining,
    setIsRefining,
    isRegenerating,
    setIsRegenerating,
    iframeRef,
    handleRegenerateDashboard,
    handleSendChat,
    handleDownloadZip,
  };
}
