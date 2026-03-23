import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Edit3,
  Check,
  X,
  Loader2,
  Sparkles,
  RefreshCw,
  Download,
} from "lucide-react";
import CoverLetterRevisions from "@/components/CoverLetterRevisions";
import { downloadTextAsDocx } from "@/lib/docxExport";

interface CoverLetterTabProps {
  id: string;
  app: any;
  coverLetter: string;
  setCoverLetter: (val: string) => void;
  editingCoverLetter: boolean;
  setEditingCoverLetter: (val: boolean) => void;
  saving: boolean;
  companyName: string;
  jobTitle: string;
  userProfile: any;
  previewCoverLetter: string | null;
  setPreviewCoverLetter: (val: string | null) => void;
  coverLetterRevisionTrigger: number;
  // Cover letter editor hook
  isRegenerating: boolean;
  clChatOpen: boolean;
  setClChatOpen: (val: boolean) => void;
  clChatInput: string;
  setClChatInput: (val: string) => void;
  clChatHistory: Array<{ role: string; content: string }>;
  clRefining: boolean;
  handleRegenerateCoverLetter: () => Promise<void>;
  handleCoverLetterVibeEdit: () => Promise<void>;
  // Actions
  saveField: (fields: Record<string, any>) => Promise<void>;
  handleCopy: (text: string, label: string) => Promise<void>;
  toast: (opts: any) => void;
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
                  // Fallback for popup blockers
                  toast({ title: "Popup blocked", description: "Allow popups to download PDF, or use DOCX download instead.", variant: "destructive" });
                  return;
                }
                const fullName = userProfile
                  ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") || "Cover Letter"
                  : "Cover Letter";
                const htmlContent = `<!DOCTYPE html><html><head><title>${fullName} - Cover Letter</title><style>
                  @page { size: letter; margin: 1in 1in 0.75in 1in; }
                  body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.6; color: #111; margin: 0; padding: 0; }
                  .content { white-space: pre-wrap; }
                </style></head><body><div class="content">${(previewCoverLetter || coverLetter).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div></body></html>`;
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
                const name = `cover-letter-${(companyName || "document").replace(/\s+/g, "-").toLowerCase()}-${(jobTitle || "").replace(/\s+/g, "-").toLowerCase()}`;
                downloadTextAsDocx(previewCoverLetter || coverLetter, `${name}.docx`);
                toast({ title: "Downloading", description: "Cover letter DOCX file is being prepared." });
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Download DOCX
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditingCoverLetter(!editingCoverLetter)}>
          <Edit3 className="mr-2 h-4 w-4" /> {editingCoverLetter ? "Cancel Edit" : "Edit"}
        </Button>
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

      <Card>
        <CardContent className="pt-6">
          {editingCoverLetter ? (
            <div className="space-y-3">
              <div className="flex gap-1 border-b border-border pb-2 mb-2">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold" onClick={() => document.execCommand("bold")}>B</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs italic" onClick={() => document.execCommand("italic")}>I</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs underline" onClick={() => document.execCommand("underline")}>U</Button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                ref={(el) => { if (el && !el.dataset.init) { el.textContent = coverLetter; el.dataset.init = "1"; } }}
                className="min-h-[400px] p-4 text-sm leading-relaxed border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring whitespace-pre-wrap"
                onBlur={(e) => setCoverLetter(e.currentTarget.innerText)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    saveField({ cover_letter: coverLetter });
                    setEditingCoverLetter(false);
                  }}
                  disabled={saving}
                >
                  <Check className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCoverLetter(app.cover_letter || "");
                    setEditingCoverLetter(false);
                  }}
                >
                  <X className="mr-2 h-4 w-4" /> Discard
                </Button>
              </div>
            </div>
          ) : (previewCoverLetter || coverLetter) ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{previewCoverLetter || coverLetter}</div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No cover letter yet.</p>
              <Button onClick={handleRegenerateCoverLetter} disabled={isRegenerating}>
                <Sparkles className="mr-2 h-4 w-4" /> Generate Cover Letter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
