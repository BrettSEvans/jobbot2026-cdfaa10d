import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Rocket, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { backgroundGenerator, type GenerationJob } from "@/lib/backgroundGenerator";
import { useNavigate } from "react-router-dom";

export type BatchEntry = {
  id: string;
  jobUrl: string;
  jobDescription: string;
  companyUrl: string;
  useManual: boolean;
};

const MAX_BATCH = 10;

function createEntry(): BatchEntry {
  return {
    id: crypto.randomUUID(),
    jobUrl: "",
    jobDescription: "",
    companyUrl: "",
    useManual: false,
  };
}

export default function BatchJobInput() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<BatchEntry[]>([createEntry()]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Map<string, { appId?: string; status: string }>>(new Map());

  const addEntry = () => {
    if (entries.length >= MAX_BATCH) {
      toast({
        title: "Limit reached",
        description: `Maximum ${MAX_BATCH} entries per batch. Need more? Contact support.`,
        variant: "destructive",
      });
      return;
    }
    setEntries((prev) => [...prev, createEntry()]);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof BatchEntry, value: string | boolean) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const isEntryValid = (entry: BatchEntry) => {
    if (entry.useManual) return entry.jobDescription.trim().length > 0;
    return entry.jobUrl.trim().length > 0;
  };

  const validEntries = entries.filter(isEntryValid);

  const handleSubmitBatch = async () => {
    if (validEntries.length === 0) return;
    setSubmitting(true);
    const newResults = new Map<string, { appId?: string; status: string }>();

    for (const entry of validEntries) {
      try {
        const appId = await backgroundGenerator.startFullGeneration({
          jobUrl: entry.useManual ? "manual-input" : entry.jobUrl,
          companyUrl: entry.companyUrl || undefined,
          jobDescription: entry.useManual ? entry.jobDescription : undefined,
          useManualInput: entry.useManual,
        });
        newResults.set(entry.id, { appId, status: "started" });
      } catch (err: any) {
        newResults.set(entry.id, { status: `error: ${err.message}` });
      }
    }

    setResults(newResults);
    setSubmitting(false);

    toast({
      title: "Batch started!",
      description: `${validEntries.length} job application(s) are being generated in the background. You can navigate away — they'll continue processing.`,
    });

    // Navigate to applications list after a short delay
    setTimeout(() => navigate("/applications"), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Batch Job Applications</h2>
          <p className="text-sm text-muted-foreground">
            Add up to {MAX_BATCH} job applications at once. All will be processed in the background.
          </p>
        </div>
        <Badge variant="secondary">{entries.length}/{MAX_BATCH}</Badge>
      </div>

      {entries.map((entry, index) => (
        <Card key={entry.id}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Application #{index + 1}
                {results.get(entry.id) && (
                  <Badge variant={results.get(entry.id)?.status === "started" ? "default" : "destructive"} className="ml-2">
                    {results.get(entry.id)?.status}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => updateEntry(entry.id, "useManual", !entry.useManual)}
                >
                  {entry.useManual ? "Use URL" : "Paste text"}
                </Button>
                {entries.length > 1 && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeEntry(entry.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {entry.useManual ? (
              <Textarea
                placeholder="Paste job description..."
                value={entry.jobDescription}
                onChange={(e) => updateEntry(entry.id, "jobDescription", e.target.value)}
                rows={4}
                className="text-sm"
              />
            ) : (
              <Input
                placeholder="Job posting URL"
                value={entry.jobUrl}
                onChange={(e) => updateEntry(entry.id, "jobUrl", e.target.value)}
                className="text-sm"
              />
            )}
            <Input
              placeholder="Company website URL (optional)"
              value={entry.companyUrl}
              onChange={(e) => updateEntry(entry.id, "companyUrl", e.target.value)}
              className="text-sm"
            />
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" onClick={addEntry} disabled={entries.length >= MAX_BATCH}>
          <Plus className="mr-2 h-4 w-4" /> Add Another
        </Button>
        <Button
          onClick={handleSubmitBatch}
          disabled={validEntries.length === 0 || submitting}
          className="flex-1"
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="mr-2 h-4 w-4" />
          )}
          Generate {validEntries.length} Application{validEntries.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}
