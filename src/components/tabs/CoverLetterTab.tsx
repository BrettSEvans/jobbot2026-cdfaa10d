import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy, Edit3, Check, X, Loader2, RefreshCw, Download } from "lucide-react";
import CoverLetterRevisions from "@/components/CoverLetterRevisions";
import WysiwygEditor from "@/components/WysiwygEditor";
import VibeEditInfo from "@/components/VibeEditInfo";
import { streamTailoredLetter } from "@/lib/api/coverLetter";
import { saveCoverLetterRevision } from "@/lib/api/coverLetterRevisions";
import { downloadCoverLetterPdf, buildCoverLetterHtml, coverLetterBodyToHtml } from "@/lib/coverLetterPdf";
import { getProfileContextForPrompt } from "@/lib/api/profile";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import GenerationProgressBar, { type PipelineStage } from "@/components/GenerationProgressBar";
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
  const [editHtml, setEditHtml] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [dateText, setDateText] = useState("");

  // Vibe Edit chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);

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

  const handleVibeEdit = async () => {
    if (!chatInput.trim() || !coverLetter.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");

    // Save current version as revision before refining
    try {
      await saveCoverLetterRevision(appId, coverLetter, `Before: ${msg.slice(0, 50)}`);
      setRevisionTrigger((t) => t + 1);
    } catch (e) { console.warn("Failed to save cover letter revision:", e); }

    setIsRefining(true);
    try {
      let accumulated = "";
      let profileContext = "";
      try { profileContext = await getProfileContextForPrompt(); } catch { /* non-critical */ }
      await streamTailoredLetter({
        jobDescription,
        customInstructions: msg,
        profileContext,
        onDelta: (text) => { accumulated += text; setCoverLetter(accumulated); },
        onDone: () => {},
      });
      await saveField({ cover_letter: accumulated });
      try {
        await saveCoverLetterRevision(appId, accumulated, `Refined: ${msg.slice(0, 50)}`);
        setRevisionTrigger((t) => t + 1);
      } catch (e) { console.warn("Failed to save cover letter revision:", e); }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsRefining(false);
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
        {coverLetter && (
          <>
            <Button data-tutorial="refine-ai-btn" variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)}>
              <Edit3 className="mr-2 h-4 w-4" /> {chatOpen ? "Hide Chat" : "Vibe Edit"}
            </Button>
            <VibeEditInfo assetType="cover_letter" />
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => {
          if (!editingCoverLetter) {
            setEditHtml(coverLetterBodyToHtml(coverLetter));
            setHeaderText(applicantName || "");
            setFooterText("");
            setDateText(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
          }
          setEditingCoverLetter(!editingCoverLetter);
        }}>
          <Edit3 className="mr-2 h-4 w-4" /> {editingCoverLetter ? "Cancel Edit" : "Edit"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRegenerateCoverLetter} disabled={isRegenerating}>
          {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Regenerate
        </Button>
      </div>

      {chatOpen && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {isRefining && (
              <div className="text-sm p-2 rounded bg-muted flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Refining cover letter...
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder={"e.g. \"Make the opening more confident and mention the company's recent product launch.\""}
                value={chatInput} onChange={(e) => setChatInput(e.target.value)} rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleVibeEdit(); } }}
              />
              <Button onClick={handleVibeEdit} disabled={!chatInput.trim() || isRefining} className="self-end">Send</Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="flex gap-2">
                <Button size="sm" variant="default" onClick={() => { setCoverLetter(editHtml); saveField({ cover_letter: editHtml }); setEditingCoverLetter(false); }} disabled={saving}>
                  <Check className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { setEditingCoverLetter(false); }}>
                  <X className="mr-2 h-4 w-4" /> Discard
                </Button>
              </div>
              <WysiwygEditor
                content={editHtml}
                onChange={setEditHtml}
                headerText={headerText}
                onHeaderChange={setHeaderText}
                footerText={footerText}
                onFooterChange={setFooterText}
                dateText={dateText}
                onDateChange={setDateText}
              />
            </div>
          ) : !coverLetter && state.isBgGenerating ? (
            <Card>
              <CardContent className="py-8 space-y-4">
                <GenerationProgressBar
                  currentStage={(state.bgJob?.status || "pending") as PipelineStage}
                  startedAt={state.bgJob?.startedAt}
                />
                <p className="text-xs text-muted-foreground text-center">You can navigate away — generation continues in the background.</p>
              </CardContent>
            </Card>
          ) : (previewCoverLetter || coverLetter) ? (
            <iframe
              srcDoc={buildCoverLetterHtml(
                previewCoverLetter || coverLetter,
                app?.company_name || "Company",
                app?.job_title || "Position",
                applicantName,
              )}
              className="w-full border rounded bg-white"
              style={{ height: "70vh" }}
              title="Cover letter preview"
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">No cover letter generated yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
