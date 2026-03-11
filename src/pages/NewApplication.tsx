import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useAppUsage } from "@/hooks/useAppUsage";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  scrapeCompanyBranding,
  analyzeCompany,
  saveJobApplication,
} from "@/lib/api/jobApplication";
import { researchCompany } from "@/lib/api/researchCompany";
import { scrapeJob, streamTailoredLetter } from "@/lib/api/coverLetter";
import { extractStyleSignalsFromMessage } from "@/lib/api/stylePreferences";
import { getActiveResumeStyles } from "@/lib/api/resume";
import { listUserResumes, type UserResume } from "@/lib/api/profile";
import ImpersonationNotice from "@/components/ImpersonationNotice";
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
  Layers,
  FileUser,
  ChevronDown,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isBlockedSite, getBlockedReason } from "@/lib/blockedScrapeSites";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import BatchJobInput from "@/components/BatchJobInput";
import GenerationProgressBar, { type PipelineStage } from "@/components/GenerationProgressBar";
import { backgroundGenerator } from "@/lib/backgroundGenerator";

type Step = "input" | "analyzing" | "complete";

const NewApplication = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { appLimit, tier, isTrialExpired } = useSubscription();
  const { data: appsUsed = 0 } = useAppUsage();
  const isAtLimit = isTrialExpired || (appLimit !== -1 && appsUsed >= appLimit);

  // Inputs
  const [jobUrl, setJobUrl] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [manualJobDescription, setManualJobDescription] = useState("");
  const [useManualInput, setUseManualInput] = useState(false);
  const [blockedSiteMessage, setBlockedSiteMessage] = useState<string | null>(null);

  // State
  const [step, setStep] = useState<Step>("input");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("scraping");
  const [generationStartedAt, setGenerationStartedAt] = useState<number | undefined>();

  // Data
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // Resume style
  const [resumeStyles, setResumeStyles] = useState<Array<{ id: string; label: string; description: string | null }>>([]);
  const [selectedResumeStyleId, setSelectedResumeStyleId] = useState<string>("");

  // Source resume selection
  const [userResumes, setUserResumes] = useState<UserResume[]>([]);
  const [selectedSourceResumeId, setSelectedSourceResumeId] = useState<string>("");

  // Load resume styles and user resumes on mount
  useEffect(() => {
    getActiveResumeStyles().then((styles) => {
      setResumeStyles(styles);
      if (styles.length > 0) setSelectedResumeStyleId(styles[0].id);
    }).catch(console.warn);

    listUserResumes().then((resumes) => {
      setUserResumes(resumes);
      const active = resumes.find((r) => r.is_active);
      if (active) setSelectedSourceResumeId(active.id);
      else if (resumes.length > 0) setSelectedSourceResumeId(resumes[0].id);
    }).catch(console.warn);
  }, []);

  // Auto-detect blocked scraping sites when URL changes
  useEffect(() => {
    if (!jobUrl.trim() || useManualInput) {
      setBlockedSiteMessage(null);
      return;
    }
    if (isBlockedSite(jobUrl)) {
      const reason = getBlockedReason(jobUrl);
      setBlockedSiteMessage(reason);
      setUseManualInput(true);
    } else {
      setBlockedSiteMessage(null);
    }
  }, [jobUrl]);


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
    setGenerationStartedAt(Date.now());

    try {
      // Use backgroundGenerator for the full pipeline
      const appId = await backgroundGenerator.startFullGeneration({
        jobUrl: jobUrl || "manual-input",
        companyUrl: companyUrl || undefined,
        jobDescription: useManualInput ? manualJobDescription.trim() : undefined,
        useManualInput,
        resumeStyleId: selectedResumeStyleId || undefined,
        sourceResumeId: selectedSourceResumeId || undefined,
      });
      setApplicationId(appId);

      // Navigate to the application detail page — generation continues in background
      toast({ title: "Application created!", description: "Your materials are being generated in the background." });
      navigate(`/applications/${appId}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      const isScrapeBlocked = errMsg.includes("blocks automated scraping");
      if (isScrapeBlocked) {
        setUseManualInput(true);
        setBlockedSiteMessage(errMsg);
      }
      toast({ title: "Error", description: errMsg, variant: "destructive" });
      setStep("input");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        <ImpersonationNotice />
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">New Job Application</h1>
        </div>

        {/* App limit gate */}
        {step === "input" && isAtLimit && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-6 text-center space-y-3">
              <p className="text-sm font-medium text-foreground">
                You've used all {appLimit} applications this month on the {tier.charAt(0).toUpperCase() + tier.slice(1)} plan.
              </p>
              <p className="text-xs text-muted-foreground">
                Upgrade your plan to create more applications.
              </p>
              <Button size="sm" onClick={() => navigate("/pricing")}>
                View Plans
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Input */}
        {step === "input" && !isAtLimit && (
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
                      onClick={() => { setUseManualInput(!useManualInput); setBlockedSiteMessage(null); }}
                      className="text-xs"
                    >
                      {useManualInput ? "Use URL instead" : "Paste text instead"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {blockedSiteMessage && (
                    <Alert variant="destructive" className="border-2 border-destructive">
                      <Info className="h-4 w-4" />
                      <AlertDescription>{blockedSiteMessage}</AlertDescription>
                    </Alert>
                  )}
                  {useManualInput && jobUrl.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Original job link:{" "}
                      <a href={jobUrl.startsWith("http") ? jobUrl : `https://${jobUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 break-all">
                        {jobUrl}
                      </a>
                    </p>
                  )}
                  {useManualInput ? (
                    <Textarea
                      placeholder="Paste the full job description text here..."
                      value={manualJobDescription}
                      onChange={(e) => setManualJobDescription(e.target.value)}
                      rows={10}
                    />
                  ) : (
                    <Input
                      data-tutorial="job-url"
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

              <Collapsible defaultOpen className="sm:!block space-y-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground sm:hidden py-2">
                  <span>Advanced Options</span>
                  <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
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
                        Used to scrape branding (fonts, colors, design) for your materials
                      </p>
                    </CardContent>
                  </Card>

                  {resumeStyles.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileUser className="h-5 w-5" /> Resume Style
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select value={selectedResumeStyleId} onValueChange={setSelectedResumeStyleId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a resume style" />
                          </SelectTrigger>
                          <SelectContent>
                            {resumeStyles.map((style) => (
                              <SelectItem key={style.id} value={style.id}>
                                <div>
                                  <span>{style.label}</span>
                                  {style.description && (
                                    <span className="text-xs text-muted-foreground ml-2">— {style.description}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                          Controls the AI-generated resume style and format
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {userResumes.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" /> Source Resume
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select value={selectedSourceResumeId} onValueChange={setSelectedSourceResumeId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a source resume" />
                          </SelectTrigger>
                          <SelectContent>
                            {userResumes.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                <span>{r.file_name}</span>
                                {r.is_active && <span className="text-xs text-primary ml-2">★</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                          The uploaded resume PDF used as the base template for AI generation
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-4">
                        <p className="text-sm text-muted-foreground">
                          No source resumes uploaded.{" "}
                          <a href="/profile" className="text-primary underline underline-offset-2">
                            Upload a resume on your Profile page
                          </a>{" "}
                          for better AI-generated results.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </CollapsibleContent>
              </Collapsible>

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
              <GenerationProgressBar
                currentStage={pipelineStage}
                startedAt={generationStartedAt}
                onCancel={applicationId ? () => {
                  backgroundGenerator.cancelJob(applicationId);
                  setStep("input");
                  toast({ title: "Cancelled", description: "Generation has been cancelled." });
                } : undefined}
              />
              <p className="text-sm text-muted-foreground text-center">{loadingMsg}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NewApplication;
