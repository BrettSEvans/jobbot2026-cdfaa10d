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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Step = "input" | "analyzing" | "review" | "generating" | "preview";

const NewApplication = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Inputs
  const [jobUrl, setJobUrl] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");

  // State
  const [step, setStep] = useState<Step>("input");
  const [loadingMsg, setLoadingMsg] = useState("");

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

  // Editable fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempEdit, setTempEdit] = useState("");

  const handleAnalyze = async () => {
    if (!jobUrl.trim()) return;
    setStep("analyzing");

    try {
      // Step 1: Scrape job posting
      setLoadingMsg("Scraping job posting...");
      const { markdown } = await scrapeJob(jobUrl);
      setJobMarkdown(markdown);

      // Step 2: Scrape company branding (if URL provided)
      let brandingData = null;
      let companyMarkdown = "";
      if (companyUrl.trim()) {
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

      // Step 3: AI analysis
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

      // Step 4: Generate cover letter
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
        onDelta: (text) => {
          accumulated += text;
          setDashboardHtml(accumulated);
        },
        onDone: () => {
          // Clean: extract just the HTML from possible markdown code fences
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

      // Save application
      const saved = await saveJobApplication({
        id: applicationId || undefined,
        job_url: jobUrl,
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
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" /> Job Posting URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="url"
                  placeholder="https://jobs.example.com/role/12345"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                />
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

            <Button onClick={handleAnalyze} disabled={!jobUrl.trim()} className="w-full" size="lg">
              <Sparkles className="mr-2 h-4 w-4" /> Analyze & Generate
            </Button>
          </div>
        )}

        {/* Step: Analyzing */}
        {step === "analyzing" && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{loadingMsg}</p>
            </CardContent>
          </Card>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div className="space-y-4">
            {/* Company Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Company & Role Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <EditableField label="Company" field="companyName" value={companyName} />
                <EditableField label="Role" field="jobTitle" value={jobTitle} />
                <EditableField label="Department" field="department" value={department} />
                <EditableField
                  label="Products"
                  field="products"
                  value={products.join(", ")}
                  displayValue={products.length ? undefined : "—"}
                />
                <EditableField
                  label="Competitors"
                  field="competitors"
                  value={competitors.join(", ")}
                  displayValue={competitors.length ? undefined : "—"}
                />
                <EditableField
                  label="Customers"
                  field="customers"
                  value={customers.join(", ")}
                  displayValue={customers.length ? undefined : "—"}
                />
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

            {/* Cover Letter */}
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

            {/* Generate Dashboard */}
            <Button onClick={handleGenerateDashboard} className="w-full" size="lg">
              <Sparkles className="mr-2 h-4 w-4" /> Generate Branded Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{loadingMsg}</p>
              {dashboardHtml && (
                <p className="text-xs text-muted-foreground">
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
            onCopy={handleCopyHtml}
            onSave={async (html) => {
              setDashboardHtml(html);
              if (applicationId) {
                await saveJobApplication({ id: applicationId, dashboard_html: html, job_url: jobUrl });
              }
            }}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
};

// Dashboard Preview with AI Chat
function DashboardPreview({
  html,
  applicationId,
  onCopy,
  onSave,
  navigate,
}: {
  html: string;
  applicationId: string | null;
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
          // Clean
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
        <Button variant="ghost" onClick={() => navigate("/applications")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> All Applications
        </Button>
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

      {/* Dashboard Preview */}
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
