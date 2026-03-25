import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Edit3,
  Loader2,
  Sparkles,
  RefreshCw,
  Download,
} from "lucide-react";
import CoverLetterRevisions from "@/components/CoverLetterRevisions";
import InlineHtmlEditor from "@/components/InlineHtmlEditor";
import { downloadTextAsDocx } from "@/lib/docxExport";
import { buildFileName } from "@/lib/fileNaming";
import VersionDownloadAlert from "@/components/VersionDownloadAlert";
import type { JobApplication, UserProfileSnapshot, ChatMessage, ToastFn } from "@/types/models";

/** Convert plain text to minimal HTML for the editor */
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap"><style>body{font-family:Roboto,Arial,sans-serif;font-size:11pt;line-height:1.6;color:#111;margin:1in;}</style></head><body><div style="white-space:pre-wrap">${escaped}</div></body></html>`;
}

/** Detect if content is HTML (vs plain text) */
function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

/** Wrap plain text cover letter in an HTML shell for iframe preview */
function previewHtml(content: string): string {
  if (isHtmlContent(content)) return content;
  return textToHtml(content);
}

interface CoverLetterTabProps {
  id: string;
  app: JobApplication;
  coverLetter: string;
  setCoverLetter: (val: string) => void;
  editingCoverLetter: boolean;
  setEditingCoverLetter: (val: boolean) => void;
  saving: boolean;
  companyName: string;
  jobTitle: string;
  userProfile: UserProfileSnapshot | null;
  previewCoverLetter: string | null;
  setPreviewCoverLetter: (val: string | null) => void;
  coverLetterRevisionTrigger: number;
  // Cover letter editor hook
  isRegenerating: boolean;
  clChatOpen: boolean;
  setClChatOpen: (val: boolean) => void;
  clChatInput: string;
  setClChatInput: (val: string) => void;
  clChatHistory: ChatMessage[];
  clRefining: boolean;
  handleRegenerateCoverLetter: () => Promise<void>;
  handleCoverLetterVibeEdit: () => Promise<void>;
  // Actions
  saveField: (fields: Record<string, unknown>) => Promise<void>;
  handleCopy: (text: string, label: string) => Promise<void>;
  toast: ToastFn;
}

export function CoverLetterTab({
  id,
  app,
  coverLetter,
  setCoverLetter,
  editingCoverLetter,
  setEditingCoverLetter,
  saving,
  companyName,
  jobTitle,
  userProfile,
  previewCoverLetter,
  setPreviewCoverLetter,
  coverLetterRevisionTrigger,
  isRegenerating,
  clChatOpen,
  setClChatOpen,
  clChatInput,
  setClChatInput,
  clChatHistory,
  clRefining,
  handleRegenerateCoverLetter,
  handleCoverLetterVibeEdit,
  saveField,
  handleCopy,
  toast,
}: CoverLetterTabProps) {

  const displayContent = previewCoverLetter || coverLetter;
  const isOlderVersion = !!previewCoverLetter;
  const [versionAlert, setVersionAlert] = useState<(() => void) | null>(null);

  const guardedDownload = useCallback((action: () => void) => {
    if (isOlderVersion) {
      setVersionAlert(() => action);
    } else {
      action();
    }
  }, [isOlderVersion]);

  const handleEditorSave = useCallback(async (html: string) => {
    setCoverLetter(html);
    await saveField({ cover_letter: html });
    setEditingCoverLetter(false);
  }, [setCoverLetter, saveField, setEditingCoverLetter]);

  const handleEditorCancel = useCallback(() => {
    setCoverLetter(app.cover_letter || "");
    setEditingCoverLetter(false);
  }, [setCoverLetter, app.cover_letter, setEditingCoverLetter]);

  const handleStartEdit = useCallback(() => {
    setEditingCoverLetter(true);
  }, [setEditingCoverLetter]);

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
              onClick={() => {
                const printWindow = window.open("", "_blank");
                if (!printWindow) {
                  toast({ title: "Popup blocked", description: "Allow popups to download PDF, or use DOCX download instead.", variant: "destructive" });
                  return;
                }
                const pdfTitle = buildFileName(userProfile?.first_name, userProfile?.last_name, "cover-letter", companyName, "pdf");
                const content = previewCoverLetter || coverLetter;
                const htmlContent = isHtmlContent(content)
                  ? content
                  : `<!DOCTYPE html><html><head><title>${pdfTitle}</title><style>
                    @page { size: letter; margin: 0; }
                    body { font-family: Roboto, Arial, sans-serif; font-size: 10.5pt; line-height: 1.6; color: #111; margin: 0; padding: 1in 1in 0.75in 1in; }
                    .content { white-space: pre-wrap; }
                  </style></head><body><div class="content">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div></body></html>`;
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.onload = () => { printWindow.print(); };
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const name = buildFileName(userProfile?.first_name, userProfile?.last_name, "cover-letter", companyName, "docx");
                downloadTextAsDocx(previewCoverLetter || coverLetter, name);
                toast({ title: "Downloading", description: "Cover letter DOCX file is being prepared." });
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Download DOCX
            </Button>
          </>
        )}
        {!editingCoverLetter && (
          <Button variant="outline" size="sm" onClick={handleStartEdit} disabled={!coverLetter}>
            <Edit3 className="mr-2 h-4 w-4" /> Edit
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleRegenerateCoverLetter} disabled={isRegenerating}>
          {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Regenerate
        </Button>
        {coverLetter && (
          <Button variant="outline" size="sm" onClick={() => setClChatOpen(!clChatOpen)}>
            <Edit3 className="mr-2 h-4 w-4" /> {clChatOpen ? "Hide Chat" : "Vibe Edit"}
          </Button>
        )}
      </div>

      {/* Vibe Edit Chat */}
      {clChatOpen && coverLetter && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {clChatHistory.map((msg, i) => (
                <div key={i} className={`text-sm p-2 rounded ${msg.role === "user" ? "bg-primary/10 text-right" : "bg-muted"}`}>{msg.content}</div>
              ))}
              {clRefining && <div className="text-sm p-2 rounded bg-muted flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Refining...</div>}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder='e.g. "Make the opening more compelling" or "Add more technical depth"'
                value={clChatInput}
                onChange={(e) => setClChatInput(e.target.value)}
                rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCoverLetterVibeEdit(); } }}
              />
              <Button onClick={handleCoverLetterVibeEdit} disabled={!clChatInput.trim() || clRefining} className="self-end">Send</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {id && coverLetter && (
        <CoverLetterRevisions
          applicationId={id}
          currentCoverLetter={coverLetter}
          onPreviewRevision={(text) => setPreviewCoverLetter(text === coverLetter ? null : text)}
          refreshTrigger={coverLetterRevisionTrigger}
        />
      )}

      {previewCoverLetter && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">Previewing older version</Badge>
          <Button variant="ghost" size="sm" onClick={() => setPreviewCoverLetter(null)}>
            Back to current
          </Button>
        </div>
      )}

      {/* Editor or Preview */}
      {editingCoverLetter ? (
        <InlineHtmlEditor
          html={isHtmlContent(coverLetter) ? coverLetter : textToHtml(coverLetter)}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          height="60vh"
        />
      ) : displayContent ? (
        <Card>
          <CardContent className="p-0">
            <div className="bg-white rounded-md overflow-hidden" style={{ height: "60vh" }}>
              <iframe
                srcDoc={previewHtml(displayContent)}
                className="w-full h-full border-0"
                title="Cover Letter Preview"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No cover letter yet.</p>
              <Button onClick={handleRegenerateCoverLetter} disabled={isRegenerating}>
                <Sparkles className="mr-2 h-4 w-4" /> Generate Cover Letter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
