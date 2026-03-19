import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, FileText, RefreshCw, CheckCircle2, Pencil } from "lucide-react";

interface SummaryPreviewProps {
  jobDescription: string;
  resumeText: string | null;
  companyName?: string;
  jobTitle?: string;
  onApprove: (summary: string) => void;
}

export default function SummaryPreview({
  jobDescription,
  resumeText,
  companyName,
  jobTitle,
  onApprove,
}: SummaryPreviewProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [keywordsUsed, setKeywordsUsed] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateSummary = useCallback(async () => {
    if (!jobDescription || jobDescription.length < 50) {
      toast({ title: "Job description too short", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-summary", {
        body: { jobDescription, resumeText, companyName, jobTitle },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Summary generation failed");
      setSummary(data.summary);
      setKeywordsUsed(data.keywords_used || []);
      setConfidence(data.confidence || "medium");
      setGenerated(true);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [jobDescription, resumeText, companyName, jobTitle, toast]);

  const charCount = summary.length;
  const charColor = charCount >= 200 && charCount <= 350 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400";

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Professional Summary Preview</span>
            {confidence && (
              <Badge
                variant={confidence === "high" ? "default" : confidence === "medium" ? "secondary" : "outline"}
                className="text-[10px]"
              >
                {confidence} match
              </Badge>
            )}
          </div>
          {!generated && (
            <Button size="sm" variant="outline" onClick={generateSummary} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              <span className="ml-1">{loading ? "Generating…" : "Preview Summary"}</span>
            </Button>
          )}
        </div>

        <AnimatePresence>
          {generated && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3"
            >
              {editing ? (
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
              ) : (
                <div className="bg-muted/50 p-3 rounded-md text-sm leading-relaxed whitespace-pre-wrap">
                  {highlightKeywords(summary, keywordsUsed)}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className={`text-xs ${charColor}`}>{charCount} chars (target: 200-350)</span>
                <div className="flex flex-wrap gap-1">
                  {keywordsUsed.slice(0, 6).map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => onApprove(summary)}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Approve & Generate Resume
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {editing ? "Done Editing" : "Edit"}
                </Button>
                <Button size="sm" variant="ghost" onClick={generateSummary} disabled={loading}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span className="ml-1">Regenerate</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

/** Highlight JD keywords in summary text */
function highlightKeywords(text: string, keywords: string[]) {
  if (!keywords.length) return text;

  // Build regex from keywords
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isKeyword = keywords.some((k) => k.toLowerCase() === part.toLowerCase());
    if (isKeyword) {
      return (
        <span key={i} className="bg-primary/20 text-primary rounded px-0.5 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}
