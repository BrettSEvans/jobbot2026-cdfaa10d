import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  getJobApplication,
  saveJobApplication,
} from "@/lib/api/jobApplication";
import { parseLlmJsonOutput, assembleDashboardHtml } from "@/lib/dashboard/assembler";
import type { DashboardData } from "@/lib/dashboard/schema";
import { useBackgroundJob } from "@/hooks/useBackgroundJob";

export interface ApplicationState {
  app: any;
  loading: boolean;
  saving: boolean;
  coverLetter: string;
  setCoverLetter: (v: string) => void;
  editingCoverLetter: boolean;
  setEditingCoverLetter: (v: boolean) => void;
  jobDescription: string;
  setJobDescription: (v: string) => void;
  companyUrl: string;
  setCompanyUrl: (v: string) => void;
  companyName: string;
  setCompanyName: (v: string) => void;
  jobTitle: string;
  setJobTitle: (v: string) => void;
  dashboardHtml: string;
  setDashboardHtml: (v: string) => void;
  dashboardData: DashboardData | null;
  setDashboardData: (v: DashboardData | null) => void;
  chatHistory: Array<{ role: string; content: string }>;
  setChatHistory: React.Dispatch<React.SetStateAction<Array<{ role: string; content: string }>>>;
  executiveReportHtml: string;
  setExecutiveReportHtml: (v: string) => void;
  raidLogHtml: string;
  setRaidLogHtml: (v: string) => void;
  archDiagramHtml: string;
  setArchDiagramHtml: (v: string) => void;
  roadmapHtml: string;
  setRoadmapHtml: (v: string) => void;
  saveField: (fields: Record<string, any>) => Promise<void>;
  handleCopy: (text: string, label: string) => Promise<void>;
  isBgGenerating: boolean;
  bgJob: ReturnType<typeof useBackgroundJob>;
  reload: () => void;
}

export function useApplicationDetail(id: string | undefined): ApplicationState {
  const { toast } = useToast();

  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [coverLetter, setCoverLetter] = useState("");
  const [editingCoverLetter, setEditingCoverLetter] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [dashboardHtml, setDashboardHtml] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);

  const [executiveReportHtml, setExecutiveReportHtml] = useState("");
  const [raidLogHtml, setRaidLogHtml] = useState("");
  const [archDiagramHtml, setArchDiagramHtml] = useState("");
  const [roadmapHtml, setRoadmapHtml] = useState("");

  const bgJob = useBackgroundJob(id);
  const isBgGenerating = !!(bgJob && !["complete", "error"].includes(bgJob.status));

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
      setExecutiveReportHtml((data as any).executive_report_html || "");
      setRaidLogHtml((data as any).raid_log_html || "");
      setArchDiagramHtml((data as any).architecture_diagram_html || "");
      setRoadmapHtml((data as any).roadmap_html || "");
      setChatHistory(Array.isArray(data.chat_history) ? data.chat_history as Array<{ role: string; content: string }> : []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bgJob?.status === "complete" && id) {
      loadApplication(id);
    }
  }, [bgJob?.status]);

  useEffect(() => {
    if (id) loadApplication(id);
    const interval = setInterval(() => {
      if (id) loadApplication(id);
    }, 10000);
    return () => clearInterval(interval);
  }, [id]);

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

  return {
    app, loading, saving,
    coverLetter, setCoverLetter, editingCoverLetter, setEditingCoverLetter,
    jobDescription, setJobDescription,
    companyUrl, setCompanyUrl,
    companyName, setCompanyName,
    jobTitle, setJobTitle,
    dashboardHtml, setDashboardHtml,
    dashboardData, setDashboardData,
    chatHistory, setChatHistory,
    executiveReportHtml, setExecutiveReportHtml,
    raidLogHtml, setRaidLogHtml,
    archDiagramHtml, setArchDiagramHtml,
    roadmapHtml, setRoadmapHtml,
    saveField, handleCopy,
    isBgGenerating, bgJob,
    reload: () => { if (id) loadApplication(id); },
  };
}
