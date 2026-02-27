import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  getJobApplication,
  saveJobApplication,
  streamDashboardGeneration,
} from "@/lib/api/jobApplication";
import { streamTailoredLetter } from "@/lib/api/coverLetter";
import {
  ArrowLeft,
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
} from "lucide-react";
import SaveAsTemplate from "@/components/SaveAsTemplate";
import DashboardRevisions from "@/components/DashboardRevisions";
import CoverLetterRevisions from "@/components/CoverLetterRevisions";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { saveDashboardRevision } from "@/lib/api/dashboardRevisions";
import { saveCoverLetterRevision } from "@/lib/api/coverLetterRevisions";
import { useBackgroundJob } from "@/hooks/useBackgroundJob";

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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [revisionTrigger, setRevisionTrigger] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewCoverLetter, setPreviewCoverLetter] = useState<string | null>(null);
  const [coverLetterRevisionTrigger, setCoverLetterRevisionTrigger] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bgJob = useBackgroundJob(id);
  const isBgGenerating = bgJob && !["complete", "error"].includes(bgJob.status);

  // Re-fetch when background job completes
  useEffect(() => {
    if (bgJob?.status === "complete" && id) {
      loadApplication(id);
    }
  }, [bgJob?.status]);

  useEffect(() => {
    if (id) loadApplication(id);
    // Poll for background generation updates
    const interval = setInterval(() => {
      if (id) loadApplication(id);
    }, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const loadApplication = async (appId: string) => {
    try {
      const data = await getJobApplication(appId);
      setApp(data);
      // Don't overwrite cover letter while user is editing
      if (!editingCoverLetter) {
        setCoverLetter(data.cover_letter || "");
      }
      setJobDescription(data.job_description_markdown || "");
      setCompanyUrl(data.company_url || "");
      setCompanyName(data.company_name || "");
      setJobTitle(data.job_title || "");
      setDashboardHtml(data.dashboard_html || "");
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

  // Regenerate cover letter
  const handleRegenerateCoverLetter = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "No job description", description: "A job description is needed to generate a cover letter.", variant: "destructive" });
      return;
    }
    // Save current version as revision before regenerating
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
        onDelta: (text) => {
          accumulated += text;
          setCoverLetter(accumulated);
        },
        onDone: () => {},
      });
      await saveField({ cover_letter: accumulated });
      // Save new version as revision
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

  // Regenerate dashboard
  const handleRegenerateDashboard = async () => {
    if (!jobDescription.trim()) return;
    setIsRegenerating(true);
    setDashboardHtml("");
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
        onDelta: (text) => {
          accumulated += text;
          setDashboardHtml(accumulated);
        },
        onDone: () => {
          let clean = accumulated;
          const htmlStart = clean.indexOf("<!DOCTYPE html>");
          const htmlStartAlt = clean.indexOf("<!doctype html>");
          const start = htmlStart !== -1 ? htmlStart : htmlStartAlt;
          if (start > 0) clean = clean.slice(start);
          const htmlEnd = clean.lastIndexOf("</html>");
          if (htmlEnd !== -1) clean = clean.slice(0, htmlEnd + 7);
          setDashboardHtml(clean);
          accumulated = clean;
        },
      });
      await saveField({ dashboard_html: accumulated });
      // Save as revision
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

  // AI refine chat — runs in background so it persists across navigation
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
        userMessage: msg,
        chatHistory: newHistory,
        jobUrl: app.job_url,
      });
      // Save pre-refinement as revision
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!app) {
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
        {/* Header */}
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
          <Badge variant={app.status === "complete" ? "default" : "secondary"}>{app.status}</Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
            <TabsTrigger value="job-description">Job Description</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)}>
                <Edit3 className="mr-2 h-4 w-4" /> {chatOpen ? "Hide Chat" : "Refine with AI"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerateDashboard} disabled={isRegenerating}>
                {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Regenerate
              </Button>
              {dashboardHtml && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(dashboardHtml);
                      toast({ title: "Copied!", description: "Dashboard HTML copied to clipboard." });
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copy HTML
                  </Button>
                  <SaveAsTemplate
                    dashboardHtml={dashboardHtml}
                    applicationId={id}
                    defaultLabel={`${companyName} ${jobTitle} Dashboard`.trim()}
                    defaultJobFunction={jobTitle}
                    defaultDepartment=""
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([dashboardHtml], { type: "text/html" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${(companyName || "dashboard").replace(/\s+/g, "-").toLowerCase()}-dashboard.html`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast({ title: "Downloaded", description: "Dashboard HTML file saved." });
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download HTML
                  </Button>
                </>
              )}
            </div>

            {/* AI Chat */}
            {chatOpen && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`text-sm p-2 rounded ${msg.role === "user" ? "bg-primary/10 text-right" : "bg-muted"}`}>
                        {msg.content}
                      </div>
                    ))}
                    {isRefining && (
                      <div className="text-sm p-2 rounded bg-muted flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Refining...
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder='e.g. "Change colors to blue" or "Add a market share chart"'
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChat();
                        }
                      }}
                    />
                    <Button onClick={handleSendChat} disabled={!chatInput.trim() || isRefining} className="self-end">
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Revision History */}
            {id && dashboardHtml && (
              <DashboardRevisions
                applicationId={id}
                currentHtml={dashboardHtml}
                onPreviewRevision={(html) => setPreviewHtml(html === dashboardHtml ? null : html)}
                refreshTrigger={revisionTrigger}
              />
            )}

            {previewHtml && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">Previewing older version</Badge>
                <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>
                  Back to current
                </Button>
              </div>
            )}

            {dashboardHtml ? (
              <Card className="overflow-hidden">
                <div className="w-full" style={{ height: "70vh" }}>
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewHtml || dashboardHtml}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts"
                    title="Dashboard Preview"
                  />
                </div>
              </Card>
            ) : isBgGenerating ? (
              <Card>
                <CardContent className="py-12 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground font-medium">{bgJob?.progress || "Generating dashboard..."}</p>
                  <p className="text-xs text-muted-foreground">You can navigate away — generation continues in the background.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No dashboard generated yet.</p>
                  <Button onClick={handleRegenerateDashboard} disabled={isRegenerating}>
                    <Sparkles className="mr-2 h-4 w-4" /> Generate Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Cover Letter Tab */}
          <TabsContent value="cover-letter" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {coverLetter && (
                <Button variant="outline" size="sm" onClick={() => handleCopy(coverLetter, "Cover letter")}>
                  <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingCoverLetter(!editingCoverLetter)}
              >
                <Edit3 className="mr-2 h-4 w-4" /> {editingCoverLetter ? "Cancel Edit" : "Edit"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerateCoverLetter} disabled={isRegenerating}>
                {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Regenerate
              </Button>
            </div>

            {/* Cover Letter Revision History */}
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
                    <Textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={16}
                      className="font-mono text-sm"
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

          {/* Job Description Tab */}
          <TabsContent value="job-description" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {jobDescription && (
                <Button variant="outline" size="sm" onClick={() => handleCopy(jobDescription, "Job description")}>
                  <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingJobDescription(!editingJobDescription)}
              >
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
                          saveField({
                            company_name: companyName,
                            job_title: jobTitle,
                            company_url: companyUrl,
                          });
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
              </CardContent>
            </Card>

            {/* Analysis data */}
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
