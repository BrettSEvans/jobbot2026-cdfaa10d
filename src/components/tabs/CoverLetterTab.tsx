import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy, Edit3, Check, X, Loader2, RefreshCw, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import CoverLetterRevisions from "@/components/CoverLetterRevisions";
import { streamTailoredLetter } from "@/lib/api/coverLetter";
import { saveCoverLetterRevision } from "@/lib/api/coverLetterRevisions";
import { downloadCoverLetterPdf } from "@/lib/coverLetterPdf";
import { getProfileContextForPrompt } from "@/lib/api/profile";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import type { ApplicationState } from "@/hooks/useApplicationDetail";

interface CoverLetterTabProps {
  appId: string;
  state: ApplicationState;
}

export default function CoverLetterTab({ appId, state }: CoverLetterTabProps) {
  const { toast } = useToast();
  const { activePersona } = useImpersonation();
  const {
    app, coverLetter, setCoverLetter, editingCoverLetter, setEditingCoverLetter,
    jobDescription, saveField, saving, handleCopy,
  } = state;

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [revisionTrigger, setRevisionTrigger] = useState(0);
  const [previewCoverLetter, setPreviewCoverLetter] = useState<string | null>(null);

  // Build applicant name from activePersona
  const applicantName = activePersona
    ? [activePersona.first_name, activePersona.last_name].filter(Boolean).join(" ") || activePersona.display_name || undefined
    : undefined;

  const handleRegenerateCoverLetter = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "No job description", description: "A job description is needed to generate a cover letter.", variant: "destructive" });
      return;
    }
    if (coverLetter.trim()) {
      try {
        await saveCoverLetterRevision(appId, coverLetter, "Before regeneration");
        setRevisionTrigger((t) => t + 1);
      } catch (e) { console.warn("Failed to save cover letter revision:", e); }
    }
    setIsRegenerating(true);
    setCoverLetter("");
    try {
      let accumulated = "";
      let profileContext = "";
      try { profileContext = await getProfileContextForPrompt(); } catch { /* non-critical */ }
      await streamTailoredLetter({
        jobDescription,
        profileContext,
        onDelta: (text) => { accumulated += text; setCoverLetter(accumulated); },
        onDone: () => {},
      });
      await saveField({ cover_letter: accumulated });
      try {
        await saveCoverLetterRevision(appId, accumulated, "Regenerated");
        setRevisionTrigger((t) => t + 1);
      } catch (e) { console.warn("Failed to save cover letter revision:", e); }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {coverLetter && (
          <>
            <Button variant="outline" size="sm" onClick={() => handleCopy(coverLetter, "Cover letter")}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCoverLetterPdf(
                  coverLetter,
                  app?.company_name || "Company",
                  app?.job_title || "Position",
                  applicantName,
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          </>
        )}
        <Button data-tutorial="refine-ai-btn" variant="outline" size="sm" onClick={() => setEditingCoverLetter(!editingCoverLetter)}>
          <Edit3 className="mr-2 h-4 w-4" /> {editingCoverLetter ? "Cancel Edit" : "Edit"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRegenerateCoverLetter} disabled={isRegenerating}>
          {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Regenerate
        </Button>
      </div>

      {coverLetter && (
        <CoverLetterRevisions
          applicationId={appId} currentCoverLetter={coverLetter}
          onPreviewRevision={(text) => setPreviewCoverLetter(text === coverLetter ? null : text)}
          refreshTrigger={revisionTrigger}
        />
      )}

      {previewCoverLetter && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">Previewing older version</Badge>
          <Button variant="ghost" size="sm" onClick={() => setPreviewCoverLetter(null)}>Back to current</Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {editingCoverLetter ? (
            <div className="space-y-3">
              <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={16} className="font-mono text-sm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { saveField({ cover_letter: coverLetter }); setEditingCoverLetter(false); }} disabled={saving}>
                  <Check className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setCoverLetter(app.cover_letter || ""); setEditingCoverLetter(false); }}>
                  <X className="mr-2 h-4 w-4" /> Discard
                </Button>
              </div>
            </div>
          ) : (previewCoverLetter || coverLetter) ? (
            <div className="prose prose-sm dark:prose-invert max-w-none max-h-[60vh] overflow-y-auto leading-relaxed">
              <ReactMarkdown>{previewCoverLetter || coverLetter}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No cover letter generated yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
