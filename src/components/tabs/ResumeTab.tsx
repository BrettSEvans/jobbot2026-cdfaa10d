import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit3,
  Loader2,
  FileText,
  RefreshCw,
  Download,
  FileDown,
} from "lucide-react";
import ResumeHealthPanel from "@/components/ResumeHealthPanel";
import ResumeRevisions from "@/components/ResumeRevisions";
import InlineHtmlEditor from "@/components/InlineHtmlEditor";
import { saveJobApplication } from "@/lib/api/jobApplication";
import { generateOptimizedResume } from "@/lib/api/resumeGeneration";
import { downloadHtmlAsDocx } from "@/lib/docxExport";
import { supabase } from "@/integrations/supabase/client";
import type { JobApplication, UserResumePickerItem, FabricationChange, ToastFn } from "@/types/models";
import type { ExtractedKeyword } from "@/lib/keywordMatcher";

/** Fit-to-page preview for resume */
function ResumePagePreview({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(Math.min(entry.contentRect.width / 816, 1));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Card className="overflow-hidden px-6">
      <div ref={containerRef} className="w-full bg-white" style={{ height: `${1056 * scale}px`, overflow: "hidden" }}>
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          title="Resume Preview"
          style={{
            width: "816px",
            height: "1056px",
            border: "none",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </Card>
  );
}

interface ResumeTabProps {
  id: string;
  app: JobApplication;
  setApp: (fn: (prev: JobApplication | null) => JobApplication | null) => void;
  jobDescription: string;
  companyName: string;
  jobTitle: string;
  resumeText: string | null;
  userResumes: UserResumePickerItem[];
  isBgGenerating: boolean;
  bgJob: import("@/lib/backgroundGenerator").GenerationJob | undefined;
  previewResumeHtml: string | null;
  setPreviewResumeHtml: (val: string | null) => void;
  resumeRevisionTrigger: number;
  setResumeRevisionTrigger: (fn: (t: number) => number) => void;
  // Resume editor hook
  regenDialogOpen: boolean;
  setRegenDialogOpen: (val: boolean) => void;
  selectedResumeId: string;
  setSelectedResumeId: (val: string) => void;
  isRegeneratingResume: boolean;
  editingResume: boolean;
  setEditingResume: (val: boolean) => void;
  handleRegenerateResume: () => Promise<void>;
  // Actions
  saveField: (fields: Record<string, unknown>) => Promise<void>;
  handleAcceptFabrication: (change: FabricationChange) => void;
  handleRevertFabrication: (change: FabricationChange) => Promise<void>;
  toast: ToastFn;
}

export function ResumeTab({
  id,
  app,
  setApp,
  jobDescription,
  companyName,
  jobTitle,
  resumeText,
  userResumes,
  isBgGenerating,
  bgJob,
  previewResumeHtml,
  setPreviewResumeHtml,
  resumeRevisionTrigger,
  setResumeRevisionTrigger,
  regenDialogOpen,
  setRegenDialogOpen,
  selectedResumeId,
  setSelectedResumeId,
  isRegeneratingResume,
  editingResume,
  setEditingResume,
  handleRegenerateResume,
  saveField,
  handleAcceptFabrication,
  handleRevertFabrication,
  toast,
}: ResumeTabProps) {
  const navigate = useNavigate();

  if (app?.resume_html) {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={editingResume ? "secondary" : "outline"}
            size="sm"
            onClick={() => { setEditingResume(true); setPreviewResumeHtml(null); }}
            disabled={editingResume}
          >
            <Edit3 className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const iframe = document.createElement("iframe");
              iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:none;";
              document.body.appendChild(iframe);
              const doc = iframe.contentDocument || iframe.contentWindow?.document;
              if (!doc) {
                toast({ title: "Error", description: "Could not open print frame.", variant: "destructive" });
                document.body.removeChild(iframe);
                return;
              }
              const printStyles = `<style>@page{size:letter;margin:0.5in}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>`;
              doc.open();
              doc.write(app.resume_html.replace("</head>", printStyles + "</head>"));
              doc.close();
              const triggerPrint = () => {
                try { iframe.contentWindow?.print(); } catch (_) {}
                setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
              };
              iframe.onload = () => setTimeout(triggerPrint, 400);
              setTimeout(triggerPrint, 1500);
            }}
          >
            <FileDown className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const name = `resume-${(companyName || "document").replace(/\s+/g, "-").toLowerCase()}-${(jobTitle || "").replace(/\s+/g, "-").toLowerCase()}`;
              downloadHtmlAsDocx(app.resume_html, `${name}.docx`);
              toast({ title: "Downloading", description: "Resume DOCX file is being prepared." });
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Download DOCX
          </Button>

          {/* Regenerate Resume */}
          <Dialog open={regenDialogOpen} onOpenChange={setRegenDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isRegeneratingResume}>
                {isRegeneratingResume ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isRegeneratingResume ? "Regenerating…" : "Regenerate"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Regenerate Resume</DialogTitle>
                <DialogDescription>
                  Choose which uploaded resume to use as the baseline for regeneration.
                </DialogDescription>
              </DialogHeader>
              {userResumes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No resumes uploaded. Go to your Profile to upload a resume first.
                </p>
              ) : (
                <div className="space-y-3 py-2">
                  <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {userResumes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.file_name}
                          {r.is_active ? " (Primary)" : ""}
                          {!r.resume_text ? " — not extracted" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedResumeId && !userResumes.find((r) => r.id === selectedResumeId)?.resume_text && (
                    <p className="text-xs text-destructive">
                      This resume's text hasn't been extracted yet. Re-upload it from your Profile.
                    </p>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setRegenDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleRegenerateResume}
                  disabled={!selectedResumeId || !userResumes.find((r) => r.id === selectedResumeId)?.resume_text}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Resume preview / editor */}
        {editingResume ? (
          <InlineHtmlEditor
            html={app.resume_html}
            height="60vh"
            onSave={async (newHtml) => {
              if (app.resume_html) {
                try {
                  await supabase.from("resume_revisions").insert({
                    application_id: id,
                    html: app.resume_html,
                    label: "Before manual edit",
                    revision_number: Date.now(),
                  });
                } catch (_) {}
              }
              await saveJobApplication({ id, job_url: app.job_url, resume_html: newHtml });
              setApp((prev) => prev ? { ...prev, resume_html: newHtml } : prev);
              setEditingResume(false);
              setResumeRevisionTrigger((t) => t + 1);
              toast({ title: "Resume saved" });
            }}
            onCancel={() => setEditingResume(false)}
          />
        ) : (
          <ResumePagePreview html={previewResumeHtml || app.resume_html} />
        )}

        {/* Resume Revision History */}
        <ResumeRevisions
          applicationId={id}
          currentHtml={app.resume_html}
          onPreviewRevision={setPreviewResumeHtml}
          refreshTrigger={resumeRevisionTrigger}
        />

        {/* Unified Resume Health Panel */}
        {jobDescription && (
          <ResumeHealthPanel
            resumeHtml={app.resume_html}
            jobDescription={jobDescription}
            resumeText={resumeText}
            companyName={companyName}
            jobTitle={jobTitle}
            onOptimize={async (missingKeywords: ExtractedKeyword[], userPrompt?: string) => {
              if (!resumeText) {
                toast({ title: "No resume found", description: "Upload a resume in your Profile first.", variant: "destructive" });
                return;
              }
              const kwList = missingKeywords.map(k => k.keyword).join(", ");
              toast({ title: "Optimizing resume…", description: `Injecting keywords: ${kwList}` });
              try {
                const { resume_html } = await generateOptimizedResume({
                  jobDescription,
                  resumeText,
                  missingKeywords,
                  userPrompt,
                  companyName,
                  jobTitle,
                });
                await saveJobApplication({ id, job_url: app.job_url, resume_html });
                setApp((prev) => prev ? { ...prev, resume_html } : prev);
                toast({ title: "Resume optimized!", description: `${missingKeywords.length} keywords injected.` });
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Unknown error";
                toast({ title: "Optimization failed", description: message, variant: "destructive" });
              }
            }}
            onApplyBulletFix={(original, replacement) => {
              const updatedHtml = app.resume_html.replace(original, replacement);
              saveJobApplication({ id, job_url: app.job_url, resume_html: updatedHtml } as any)
                .then(() => setApp((prev: any) => ({ ...prev, resume_html: updatedHtml })));
              toast({ title: "Bullet updated", description: `Replaced: "${original.slice(0, 40)}…"` });
            }}
            onAcceptFabrication={handleAcceptFabrication}
            onRevertFabrication={handleRevertFabrication}
          />
        )}
      </>
    );
  }

  if (isBgGenerating) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium">{bgJob?.progress || "Generating resume..."}</p>
          <p className="text-xs text-muted-foreground">You can navigate away — generation continues in the background.</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-3">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
        <h3 className="font-medium">No resume generated yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {!resumeText
            ? "Add your resume text in your Profile first, then use Keyword Analysis to generate an optimized resume."
            : !jobDescription
            ? "Add a job description in the JD Analysis tab, then use Keyword Analysis to generate an optimized resume."
            : "Use Keyword Analysis in this tab to generate an optimized, keyword-injected resume."}
        </p>
        {!resumeText && (
          <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
            Go to Profile
          </Button>
        )}
        {resumeText && jobDescription && (
          <ResumeHealthPanel
            resumeHtml=""
            jobDescription={jobDescription}
            resumeText={resumeText}
            companyName={companyName}
            jobTitle={jobTitle}
            onOptimize={async (missingKeywords: ExtractedKeyword[], userPrompt?: string) => {
              const kwList = missingKeywords.map(k => k.keyword).join(", ");
              toast({ title: "Optimizing resume…", description: `Injecting keywords: ${kwList}` });
              try {
                const { resume_html } = await generateOptimizedResume({
                  jobDescription, resumeText, missingKeywords, userPrompt, companyName, jobTitle,
                });
                await saveJobApplication({ id, job_url: app.job_url, resume_html } as any);
                setApp((prev: any) => ({ ...prev, resume_html }));
                toast({ title: "Resume optimized!", description: `${missingKeywords.length} keywords injected.` });
              } catch (e: any) {
                toast({ title: "Optimization failed", description: e.message, variant: "destructive" });
              }
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
