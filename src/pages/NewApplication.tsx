import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  scrapeCompanyBranding,
  analyzeCompany,
  streamDashboardGeneration,
  saveJobApplication,
} from "@/lib/api/jobApplication";
import { scrapeJob, streamTailoredLetter } from "@/lib/api/coverLetter";
import {
  Loader2,
  Globe,
  Link,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Edit3,
  Copy,
  Layers,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BatchJobInput from "@/components/BatchJobInput";
import TemplateSelector from "@/components/TemplateSelector";
import SaveAsTemplate from "@/components/SaveAsTemplate";
import GenerationProgressBar, { type PipelineStage } from "@/components/GenerationProgressBar";
import type { DashboardTemplate } from "@/lib/api/templates";

type Step = "input" | "analyzing" | "review" | "generating" | "preview";
type AnalyzeStage = "scraping" | "branding" | "analyzing" | "cover-letter" | "complete";

const NewApplication = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Inputs
  const [jobUrl, setJobUrl] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [manualJobDescription, setManualJobDescription] = useState("");
  const [useManualInput, setUseManualInput] = useState(false);

  // State
  const [step, setStep] = useState<Step>("input");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("scraping");

  // Data
  const [jobMarkdown, setJobMarkdown] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [branding, setBranding] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [dashboardHtml, setDashboardHtml] = useState("");
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // Template
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);

  // Editable fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempEdit, setTempEdit] = useState("");

  const isValidUrl = (str: string) => {
    try {
      const u = new URL(str.startsWith('http') ? str : `https://${str}`);
      return !!u.hostname.includes('.');
    } catch { return false; }
  };

  const handleAnalyze = async () => {
    if (!useManualInput && !jobUrl.trim()) return;
    if (useManualInput && !manualJobDescription.trim()) return;
    if (!useManualInput && !isValidUrl(jobUrl)) {
      toast({ title: "Invalid URL", description: "Please enter a valid job posting URL.", variant: "destructive" });
      return;
    }
    setStep("analyzing");
    setPipelineStage("scraping");

    try {
      let markdown = "";

      if (useManualInput) {
        markdown = manualJobDescription.trim();
        setJobMarkdown(markdown);
      } else {
        setLoadingMsg("Scraping job posting...");
        const result = await scrapeJob(jobUrl);
        markdown = result.markdown;
        setJobMarkdown(markdown);
      }

      // Scrape company branding
      let brandingData = null;
      let companyMarkdown = "";
      if (companyUrl.trim()) {
        setPipelineStage("branding");
        setLoadingMsg("Scraping company branding & design...");
        try {
          const result = await scrapeCompanyBranding(companyUrl);
          brandingData = result.branding;
          companyMarkdown = result.markdown;
          setBranding(brandingData);
        } catch (e) {
          console.warn("Branding scrape failed, continuing:", e);
        }
      }

      // AI analysis
      setPipelineStage("analyzing");
      setLoadingMsg("Analyzing company, competitors & products...");
      try {
        const analysis = await analyzeCompany({
          companyMarkdown,
          jobDescription: markdown,
          companyName: companyName || undefined,
        });
        setCompanyName(analysis.companyName || "");
        setJobTitle(analysis.jobTitle || "");
        setDepartment(analysis.department || "");
        setCompetitors(analysis.competitors || []);
        setCustomers(analysis.customers || []);
        setProducts(analysis.products || []);
      } catch (e) {
        console.warn("Analysis failed, continuing:", e);
      }

      // Generate cover letter
      setPipelineStage("cover-letter");
      setLoadingMsg("Generating tailored cover letter...");
      setCoverLetter("");
      await streamTailoredLetter({
        jobDescription: markdown,
        onDelta: (text) => setCoverLetter((prev) => prev + text),
        onDone: () => {},
      });

      setStep("review");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setStep("input");
    }
  };

  const handleGenerateDashboard = async () => {
    setStep("generating");
    setPipelineStage("dashboard");
    setLoadingMsg("Generating branded dashboard...");
    setDashboardHtml("");

    try {
      let accumulated = "";
      await streamDashboardGeneration({
        jobDescription: jobMarkdown,
        branding,
        companyName,
        jobTitle,
        competitors,
        customers,
        products,
        department,
        templateHtml: selectedTemplate?.dashboard_html,
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
        },
      });

      const saved = await saveJobApplication({
        id: applicationId || undefined,
        job_url: jobUrl || "manual-input",
        company_url: companyUrl || undefined,
        company_name: companyName || undefined,
        job_title: jobTitle || undefined,
        job_description_markdown: jobMarkdown,
        cover_letter: coverLetter,
        branding,
        dashboard_html: dashboardHtml,
        competitors,
        customers,
        products,
        status: "complete",
      });
      setApplicationId(saved.id);

      setStep("preview");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setStep("review");
    }
  };

  const handleCopyHtml = async () => {
    await navigator.clipboard.writeText(dashboardHtml);
    toast({ title: "Copied!", description: "Dashboard HTML copied to clipboard." });
  };

  const handleCopyCoverLetter = async () => {
    await navigator.clipboard.writeText(coverLetter);
    toast({ title: "Copied!", description: "Cover letter copied to clipboard." });
  };

  const startEditField = (field: string, value: string) => {
    setEditingField(field);
    setTempEdit(value);
  };

  const saveEditField = (field: string) => {
    switch (field) {
      case "companyName": setCompanyName(tempEdit); break;
      case "jobTitle": setJobTitle(tempEdit); break;
      case "department": setDepartment(tempEdit); break;
      case "competitors": setCompetitors(tempEdit.split(",").map(s => s.trim()).filter(Boolean)); break;
      case "customers": setCustomers(tempEdit.split(",").map(s => s.trim()).filter(Boolean)); break;
      case "products": setProducts(tempEdit.split(",").map(s => s.trim()).filter(Boolean)); break;
    }
    setEditingField(null);
  };

  const EditableField = ({ label, field, value, displayValue }: { label: string; field: string; value: string; displayValue?: string }) => (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm font-medium text-muted-foreground">{label}:</span>
      {editingField === field ? (
        <div className="flex items-center gap-1 flex-1 ml-2">
          <Input
            value={tempEdit}
            onChange={(e) => setTempEdit(e.target.value)}
            className="h-7 text-sm"
            onKeyDown={(e) => e.key === "Enter" && saveEditField(field)}
          />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEditField(field)}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1 ml-2 justify-end">
          <span className="text-sm text-right">{displayValue || value || "—"}</span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEditField(field, value)}>
            <Edit3 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">New Job Application</h1>
        </div>

        {/* Step: Input */}
        {step === "input" && (
          <Tabs defaultValue="single" className="space-y-4">
            <TabsList>
              <TabsTrigger value="single">Single Application</TabsTrigger>
              <TabsTrigger value="batch">
                <Layers className="mr-1 h-4 w-4" /> Batch ({`up to ${10}`})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {useManualInput ? <FileText className="h-5 w-5" /> : <Link className="h-5 w-5" />}
                      {useManualInput ? "Paste Job Description" : "Job Posting URL"}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUseManualInput(!useManualInput)}
                      className="text-xs"
                    >
                      {useManualInput ? "Use URL instead" : "Paste text instead"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {useManualInput ? (
                    <Textarea
                      placeholder="Paste the full job description text here..."
                      value={manualJobDescription}
                      onChange={(e) => setManualJobDescription(e.target.value)}
                      rows={10}
                    />
                  ) : (
                    <Input
                      type="url"
                      placeholder="https://jobs.example.com/role/12345"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                    />
                  )}
                  {!useManualInput && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Can't scrape the page? Click "Paste text instead" above.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" /> Company Website URL (optional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Used to scrape branding (fonts, colors, design) for the dashboard
                  </p>
                </CardContent>
              </Card>

              <Button
                onClick={handleAnalyze}
                disabled={useManualInput ? !manualJobDescription.trim() : !jobUrl.trim()}
                className="w-full"
                size="lg"
              >
                <Sparkles className="mr-2 h-4 w-4" /> Analyze & Generate
              </Button>
            </TabsContent>

            <TabsContent value="batch">
              <BatchJobInput />
            </TabsContent>
          </Tabs>
        )}

        {/* Step: Analyzing */}
        {step === "analyzing" && (
          <Card>
            <CardContent className="py-10 space-y-6">
              <GenerationProgressBar currentStage={pipelineStage} />
              <p className="text-sm text-muted-foreground text-center">{loadingMsg}</p>
            </CardContent>
          </Card>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Job Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[200px] overflow-y-auto bg-muted/50 rounded-md p-3">
                  {jobMarkdown}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Company & Role Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <EditableField label="Company" field="companyName" value={companyName} />
                <EditableField label="Role" field="jobTitle" value={jobTitle} />
                <EditableField label="Department" field="department" value={department} />
                <EditableField label="Products" field="products" value={products.join(", ")} displayValue={products.length ? undefined : "—"} />
                <EditableField label="Competitors" field="competitors" value={competitors.join(", ")} displayValue={competitors.length ? undefined : "—"} />
                <EditableField label="Customers" field="customers" value={customers.join(", ")} displayValue={customers.length ? undefined : "—"} />
                {branding && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm font-medium text-muted-foreground">Branding:</span>
                    <Badge variant="secondary">✓ Captured</Badge>
                    {branding.colors && Object.entries(branding.colors).slice(0, 4).map(([key, val]) => (
                      <div
                        key={key}
                        className="h-5 w-5 rounded-full border"
                        style={{ backgroundColor: val as string }}
                        title={`${key}: ${val}`}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Tailored Cover Letter
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleCopyCoverLetter}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[300px] overflow-y-auto">
                  {coverLetter}
                </div>
              </CardContent>
            </Card>

            {/* Template selection + Generate */}
            <div className="flex items-center gap-2">
              <TemplateSelector onSelect={(t) => setSelectedTemplate(t)} />
              {selectedTemplate && (
                <Badge variant="secondary" className="text-xs">
                  Using: {selectedTemplate.label}
                </Badge>
              )}
            </div>

            <Button onClick={handleGenerateDashboard} className="w-full" size="lg">
              <Sparkles className="mr-2 h-4 w-4" /> Generate Branded Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <Card>
            <CardContent className="py-10 space-y-6">
              <GenerationProgressBar currentStage={pipelineStage} />
              <p className="text-sm text-muted-foreground text-center">{loadingMsg}</p>
              {dashboardHtml && (
                <p className="text-xs text-muted-foreground text-center">
                  {Math.round(dashboardHtml.length / 1024)}KB generated...
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <DashboardPreview
            html={dashboardHtml}
            applicationId={applicationId}
            companyName={companyName}
            jobTitle={jobTitle}
            department={department}
            onCopy={handleCopyHtml}
            onSave={async (html) => {
              setDashboardHtml(html);
              if (applicationId) {
                await saveJobApplication({ id: applicationId, dashboard_html: html, job_url: jobUrl || "manual-input" });
              }
            }}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
};

// Dashboard Preview with AI Chat + Save as Template
function DashboardPreview({
  html,
  applicationId,
  companyName,
  jobTitle,
  department,
  onCopy,
  onSave,
  navigate,
}: {
  html: string;
  applicationId: string | null;
  companyName?: string;
  jobTitle?: string;
  department?: string;
  onCopy: () => void;
  onSave: (html: string) => Promise<void>;
  navigate: (path: string) => void;
}) {
  const { toast } = useToast();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [currentHtml, setCurrentHtml] = useState(html);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleSendChat = async () => {
    if (!chatInput.trim() || isRefining) return;
    const msg = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    setIsRefining(true);

    try {
      const { streamDashboardRefinement } = await import("@/lib/api/jobApplication");
      let accumulated = "";
      await streamDashboardRefinement({
        currentHtml: currentHtml,
        userMessage: msg,
        chatHistory: newHistory,
        onDelta: (text) => { accumulated += text; },
        onDone: () => {
          let clean = accumulated;
          const htmlStart = clean.indexOf("<!DOCTYPE html>");
          const htmlStartAlt = clean.indexOf("<!doctype html>");
          const start = htmlStart !== -1 ? htmlStart : htmlStartAlt;
          if (start > 0) clean = clean.slice(start);
          const htmlEnd = clean.lastIndexOf("</html>");
          if (htmlEnd !== -1) clean = clean.slice(0, htmlEnd + 7);

          setCurrentHtml(clean);
          setChatHistory((prev) => [...prev, { role: "assistant", content: "✅ Dashboard updated! Check the preview." }]);
          onSave(clean);
        },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setChatHistory((prev) => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={onCopy} variant="outline">
          <Copy className="mr-2 h-4 w-4" /> Copy HTML
        </Button>
        <Button onClick={() => setChatOpen(!chatOpen)} variant="outline">
          <Edit3 className="mr-2 h-4 w-4" /> {chatOpen ? "Hide Chat" : "Refine with AI"}
        </Button>
        <SaveAsTemplate
          dashboardHtml={currentHtml}
          applicationId={applicationId || undefined}
          defaultLabel={`${companyName || ""} ${jobTitle || ""} Dashboard`.trim()}
          defaultJobFunction={jobTitle}
          defaultDepartment={department}
        />
        <Button
          variant="outline"
          onClick={() => {
            const blob = new Blob([currentHtml], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${(companyName || "dashboard").replace(/\s+/g, "-").toLowerCase()}-dashboard.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="mr-2 h-4 w-4" /> Download HTML
        </Button>
        <Button variant="ghost" onClick={() => navigate("/applications")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> All Applications
        </Button>
      </div>

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
                  <Loader2 className="h-3 w-3 animate-spin" /> Refining dashboard...
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder='e.g. "Change the primary color to blue" or "Add a market share chart"'
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

      <Card className="overflow-hidden">
        <div className="w-full" style={{ height: "70vh" }}>
          <iframe
            ref={iframeRef}
            srcDoc={currentHtml}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
            title="Dashboard Preview"
          />
        </div>
      </Card>
    </div>
  );
}

export default NewApplication;
