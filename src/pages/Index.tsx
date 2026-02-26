import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { scrapeJob, streamTailoredLetter } from "@/lib/api/coverLetter";
import { Copy, RefreshCw, PenLine, FileText, Loader2, ArrowLeft } from "lucide-react";

type AppState = "input" | "loading" | "result";

const Index = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [appState, setAppState] = useState<AppState>("input");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [jobData, setJobData] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState("");

  const generate = useCallback(async (jobMarkdown: string, customInstructions?: string) => {
    setAppState("loading");
    setLoadingMessage("Generating tailored cover letter...");
    setCoverLetter("");

    try {
      await streamTailoredLetter({
        jobDescription: jobMarkdown,
        customInstructions,
        onDelta: (text) => {
          setCoverLetter((prev) => prev + text);
          setAppState("result");
        },
        onDone: () => setAppState("result"),
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setAppState(jobData ? "result" : "input");
    }
  }, [jobData, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setAppState("loading");
    setLoadingMessage("Scraping job posting...");

    try {
      const { markdown } = await scrapeJob(url);
      setJobData(markdown);
      await generate(markdown);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setAppState("input");
    }
  };

  const handleRegenerate = () => {
    if (jobData) generate(jobData);
  };

  const handleRewriteWithInstructions = () => {
    if (jobData && instructions.trim()) {
      setShowInstructions(false);
      generate(jobData, instructions.trim());
      setInstructions("");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(coverLetter);
    toast({ title: "Copied!", description: "Cover letter copied to clipboard." });
  };

  const handleNewJob = () => {
    setUrl("");
    setCoverLetter("");
    setJobData(null);
    setShowInstructions(false);
    setInstructions("");
    setAppState("input");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Cover Letter Tailor</h1>
          </div>
          <p className="text-muted-foreground">
            Paste a job posting URL and get a tailored cover letter in seconds.
          </p>
        </header>

        {appState === "input" && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="url"
                  placeholder="https://jobs.example.com/role/12345"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" size="lg">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Cover Letter
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {appState === "loading" && !coverLetter && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{loadingMessage}</p>
            </CardContent>
          </Card>
        )}

        {(appState === "result" || (appState === "loading" && coverLetter)) && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {coverLetter}
                  {appState === "loading" && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                  )}
                </div>
              </CardContent>
            </Card>

            {appState === "result" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleCopy} variant="outline">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                  <Button onClick={handleRegenerate} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                  <Button
                    onClick={() => setShowInstructions(!showInstructions)}
                    variant="outline"
                  >
                    <PenLine className="mr-2 h-4 w-4" />
                    Rewrite with Instructions
                  </Button>
                  <Button onClick={handleNewJob} variant="ghost">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    New Job
                  </Button>
                </div>

                {showInstructions && (
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <Textarea
                        placeholder='e.g. "Emphasize my analytics experience" or "Make the tone more casual"'
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        rows={3}
                      />
                      <Button
                        onClick={handleRewriteWithInstructions}
                        disabled={!instructions.trim()}
                        className="w-full"
                      >
                        Rewrite
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
