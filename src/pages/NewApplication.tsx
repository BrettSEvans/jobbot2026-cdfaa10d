import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Globe,
  Link,
  FileText,
  Sparkles,
  ArrowLeft,
  Layers,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BatchJobInput from "@/components/BatchJobInput";
import GenerationProgressBar, { type PipelineStage } from "@/components/GenerationProgressBar";
import { backgroundGenerator } from "@/lib/backgroundGenerator";

type Step = "input" | "analyzing";

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
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("reviewing-job");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | undefined>();

  const isValidUrl = (str: string) => {
    try {
      const u = new URL(str.startsWith('http') ? str : `https://${str}`);
      return !!u.hostname.includes('.');
    } catch { return false; }
  };

  // Subscribe to background job updates for navigation
  useEffect(() => {
    if (!applicationId) return;
    const unsub = backgroundGenerator.subscribe(() => {
      const job = backgroundGenerator.getJob(applicationId);
      if (!job) return;

      // Map background job status to pipeline stages
      const statusToStage: Record<string, PipelineStage> = {
        "pending": "reviewing-job",
        "reviewing-job": "reviewing-job",
        "branding": "branding",
        "analyzing": "analyzing",
        "research": "research",
        "resume": "resume",
      };
      
      if (statusToStage[job.status]) {
        setPipelineStage(statusToStage[job.status]);
      }

      if (job.status === "error") {
        setPipelineError(job.error || "Generation failed");
      }

      // Navigate when resume is complete (or later stages)
      if (job.status === "resume-complete" || job.status === "cover-letter" || job.status === "dashboard" || job.status === "complete") {
        setPipelineStage("complete");
        navigate(`/applications/${applicationId}`);
      }
    });
    return unsub;
  }, [applicationId, navigate]);

  const handleAnalyze = async () => {
    if (!useManualInput && !jobUrl.trim()) return;
    if (useManualInput && !manualJobDescription.trim()) return;
    if (!useManualInput && !isValidUrl(jobUrl)) {
      toast({ title: "Invalid URL", description: "Please enter a valid job posting URL.", variant: "destructive" });
      return;
    }
    setStep("analyzing");
    setPipelineStage("reviewing-job");
    setPipelineError(undefined);

    try {
      const appId = await backgroundGenerator.startFullGeneration({
        jobUrl: jobUrl || "manual-input",
        companyUrl: companyUrl || undefined,
        jobDescription: useManualInput ? manualJobDescription.trim() : undefined,
        useManualInput,
      });
      setApplicationId(appId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setStep("input");
    }
  };

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

        {/* Step: Analyzing — shows progress bar while pipeline runs */}
        {step === "analyzing" && (
          <Card>
            <CardContent className="py-10 space-y-6">
              <GenerationProgressBar currentStage={pipelineStage} error={pipelineError} />
              <div className="flex items-center justify-center gap-3 mt-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Building your application... You'll be redirected when your resume is ready.
                </p>
              </div>
              {pipelineError && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => { setStep("input"); setPipelineError(undefined); }}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NewApplication;
