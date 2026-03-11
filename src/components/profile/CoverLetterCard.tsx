import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SaveCardButton from "./SaveCardButton";

interface CoverLetterCardProps {
  masterCoverLetter: string;
  setMasterCoverLetter: (v: string) => void;
  isDirty: boolean;
  saving: boolean;
  savingCard: string | null;
  onSave: (cardName: string) => void;
  cardBorderClass: string;
}

/* ── Drop Zone ──────────────────────────────────────────── */

function CoverLetterDropZone({
  fileRef,
  extracting,
  onFileSelected,
}: {
  fileRef: React.RefObject<HTMLInputElement>;
  extracting: boolean;
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileRef.current) {
      fileRef.current.files = dt.files;
      fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !extracting && fileRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors
        ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}
        ${extracting ? "pointer-events-none opacity-60" : ""}
      `}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={onFileSelected}
        className="hidden"
      />
      {extracting ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      ) : (
        <div className="rounded-full bg-primary/10 p-2.5">
          <Upload className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {extracting ? "Extracting text…" : "Drag & drop a cover letter here"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or <span className="text-primary font-medium underline underline-offset-2">click to browse</span> · PDF, DOCX, or TXT · 2 MB max
        </p>
      </div>
    </div>
  );
}

/* ── Main Card ──────────────────────────────────────────── */

export default function CoverLetterCard({
  masterCoverLetter,
  setMasterCoverLetter,
  isDirty,
  saving,
  savingCard,
  onSave,
  cardBorderClass,
}: CoverLetterCardProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);

  const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

  const readTextFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });

  const extractPdfText = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-resume-text`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: formData,
      },
    );
    if (!res.ok) throw new Error("PDF text extraction failed");
    const json = await res.json();
    return json.text ?? "";
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 2 MB.", variant: "destructive" });
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt"].includes(ext ?? "")) {
      toast({ title: "Unsupported file type", description: "Please upload a PDF, DOCX, or TXT file.", variant: "destructive" });
      return;
    }

    setExtracting(true);
    try {
      let text = "";
      if (ext === "pdf") {
        text = await extractPdfText(file);
      } else {
        // .txt and .docx — read as text (basic extraction)
        text = await readTextFile(file);
      }

      if (!text.trim()) {
        toast({ title: "No text found", description: "Could not extract any text from this file. Try pasting it directly.", variant: "destructive" });
      } else {
        setMasterCoverLetter(text.trim());
        toast({ title: "Cover letter extracted", description: `Text imported from ${file.name}. Review and save when ready.` });
      }
    } catch {
      toast({ title: "Extraction failed", description: "Something went wrong reading the file. Try pasting your cover letter instead.", variant: "destructive" });
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card className={cardBorderClass}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Master Cover Letter
            <Badge variant="outline" className="text-xs font-normal">Optional</Badge>
          </CardTitle>
          {isDirty && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
              Unsaved
            </Badge>
          )}
        </div>
        <CardDescription>
          Upload a cover letter, paste one in, or just jot down a few ideas about what makes you a great fit.{" "}
          <strong className="text-foreground">ResuVibe will do the rest!</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CoverLetterDropZone
          fileRef={fileRef}
          extracting={extracting}
          onFileSelected={handleFileSelected}
        />

        {!masterCoverLetter.trim() && (
          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span>
              <strong className="text-foreground">Don't have a polished cover letter?</strong>{" "}
              No problem — even a few bullet points about your strengths will give the AI enough to craft something great.
            </span>
          </div>
        )}
        <Textarea
          data-tutorial="master-cover-letter"
          rows={10}
          placeholder="Upload a file above, paste a cover letter here, or just jot down a few ideas — e.g. 'I'm passionate about scaling infrastructure' or 'I led a team of 12 engineers'…"
          value={masterCoverLetter}
          onChange={(e) => setMasterCoverLetter(e.target.value)}
        />
      </CardContent>
      <SaveCardButton
        cardName="coverLetter"
        isDirty={isDirty}
        saving={saving}
        savingCard={savingCard}
        onSave={onSave}
      />
    </Card>
  );
}
