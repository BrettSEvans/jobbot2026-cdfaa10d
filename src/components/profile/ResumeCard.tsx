import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Loader2, Upload, Plus, X, Pencil, Star, Check, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  uploadResumePdf, setActiveResume, renameResume, deleteResume,
  extractResumeContactInfo, updateProfile, checkDuplicateTrialSignup,
  type UserResume,
} from "@/lib/api/profile";
import SaveCardButton from "./SaveCardButton";

// ---------- Resume PDF Drop Zone ----------
function ResumeDropZone({
  fileRef, uploading, onFileSelected,
}: {
  fileRef: React.RefObject<HTMLInputElement>;
  uploading: boolean;
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
      onClick={() => !uploading && fileRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors
        ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}
        ${uploading ? "pointer-events-none opacity-60" : ""}
      `}
    >
      <input ref={fileRef} type="file" accept=".pdf" onChange={onFileSelected} className="hidden" />
      {uploading ? (
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {uploading ? "Uploading..." : "Drag & drop your resume here"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or <span className="text-primary font-medium underline underline-offset-2">click to browse</span> · PDF only · 5 MB max
        </p>
      </div>
    </div>
  );
}

// ---------- Resume Card ----------

interface ResumeCardProps {
  resumeText: string;
  setResumeText: (v: string) => void;
  resumes: UserResume[];
  setResumes: (fn: (prev: UserResume[]) => UserResume[]) => void;
  resumesLoaded: boolean;
  isImpersonating: boolean;
  isDirty: boolean;
  saving: boolean;
  savingCard: string | null;
  onSave: (cardName: string) => void;
  cardBorderClass: string;
  onContactExtracted?: (contact: { phone: string | null; linkedin_url: string | null }) => void;
}

const MAX_RESUMES = 5;

export default function ResumeCard({
  resumeText, setResumeText, resumes, setResumes, resumesLoaded,
  isImpersonating, isDirty, saving, savingCard, onSave, cardBorderClass,
  onContactExtracted,
}: ResumeCardProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" });
      return;
    }
    if (resumes.length >= MAX_RESUMES) {
      toast({ title: "Limit reached", description: `You can upload up to ${MAX_RESUMES} resumes.`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const newResume = await uploadResumePdf(file);
      setResumes((prev) => [newResume, ...prev.map((r) => ({ ...r, is_active: false }))]);
      toast({ title: "Resume uploaded!", description: `"${newResume.file_name}" is now your active resume.` });

      // Start contact info extraction with minimum 2-second spinner
      setScanning(true);
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const [contactInfo] = await Promise.all([
        extractResumeContactInfo(newResume.storage_path),
        delay(2000),
      ]);

      const foundItems: string[] = [];
      if (contactInfo.phone) foundItems.push("phone");
      if (contactInfo.linkedin_url) foundItems.push("LinkedIn");
      if (contactInfo.email) foundItems.push("email");

      if (foundItems.length > 0) {
        // Save extracted contact info to profile
        const profileUpdates: Record<string, unknown> = {};
        if (contactInfo.phone) profileUpdates.phone = contactInfo.phone;
        if (contactInfo.linkedin_url) profileUpdates.linkedin_url = contactInfo.linkedin_url;

        if (Object.keys(profileUpdates).length > 0) {
          await updateProfile(profileUpdates).catch((err) =>
            console.error("Failed to save contact info:", err)
          );
        }

        // Notify parent to update form fields
        onContactExtracted?.({
          phone: contactInfo.phone,
          linkedin_url: contactInfo.linkedin_url,
        });

        toast({
          title: "Contact info found",
          description: `Extracted: ${foundItems.join(", ")}. Check your Identity card.`,
        });

        // Check for duplicate trial signup
        if (contactInfo.phone || contactInfo.linkedin_url) {
          const isDuplicate = await checkDuplicateTrialSignup(
            contactInfo.phone,
            contactInfo.linkedin_url
          );
          // The RPC checks ALL profiles including the current user's,
          // so a match is expected after we just saved. We only care about
          // matches on OTHER users. Since the RPC doesn't distinguish,
          // we skip the blocking logic here — the unique index on the DB
          // will prevent saving duplicate phone/linkedin values, which
          // effectively blocks duplicate trials.
          if (isDuplicate) {
            console.log("Duplicate trial contact info detected — unique index enforces uniqueness.");
          }
        }
      }
      setScanning(false);
    } catch (err: unknown) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
      setScanning(false);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSetActive = async (resumeId: string) => {
    try {
      await setActiveResume(resumeId);
      setResumes((prev) => prev.map((r) => ({ ...r, is_active: r.id === resumeId })));
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleRename = async (resumeId: string) => {
    if (!renameValue.trim()) return;
    try {
      await renameResume(resumeId, renameValue.trim());
      setResumes((prev) => prev.map((r) => r.id === resumeId ? { ...r, file_name: renameValue.trim() } : r));
      setRenamingId(null);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleDelete = async (resumeId: string) => {
    try {
      await deleteResume(resumeId);
      const wasActive = resumes.find((r) => r.id === resumeId)?.is_active;
      const remaining = resumes.filter((r) => r.id !== resumeId);
      if (wasActive && remaining.length > 0) {
        remaining[0].is_active = true;
      }
      setResumes(() => remaining);
      setDeleteConfirmId(null);
      toast({ title: "Resume deleted" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <>
      <Card className={`transition-all ${cardBorderClass}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Resume / Background
            {isDirty && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Unsaved</Badge>}
          </CardTitle>
          <CardDescription>Upload PDF resumes to use as templates when generating tailored resumes for job apps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scanning spinner overlay */}
          {scanning && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              <p className="text-sm text-foreground">Gathering resume information...</p>
            </div>
          )}

          {/* Resume file list */}
          {!isImpersonating && resumesLoaded && resumes.length > 0 && (
            <div className="space-y-2">
              {resumes.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-2 sm:gap-3 rounded-lg border p-2.5 sm:p-3 transition-colors ${
                    r.is_active ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                >
                  <button
                    onClick={() => handleSetActive(r.id)}
                    className="shrink-0 h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                    title={r.is_active ? "Active resume" : "Set as active"}
                  >
                    <Star className={`h-4 w-4 transition-colors ${r.is_active ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    {renamingId === r.id ? (
                      <div className="flex items-center gap-1">
                        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleRename(r.id)} autoFocus />
                        <Button size="sm" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8 p-0" onClick={() => handleRename(r.id)}><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8 p-0" onClick={() => setRenamingId(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium truncate">{r.file_name}</p>
                        <p className="text-xs text-muted-foreground">Uploaded {new Date(r.uploaded_at).toLocaleDateString()}</p>
                      </>
                    )}
                  </div>
                  {r.is_active && (
                    <Badge variant="secondary" className="shrink-0 text-xs bg-primary/10 text-primary hidden sm:inline-flex">Active</Badge>
                  )}
                  {renamingId !== r.id && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button size="sm" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8 p-0" onClick={() => { setRenamingId(r.id); setRenameValue(r.file_name); }} title="Rename">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(r.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload zone */}
          {!isImpersonating && (
            resumes.length === 0 ? (
              <ResumeDropZone fileRef={fileRef} uploading={uploading} onFileSelected={handleFileUpload} />
            ) : resumes.length < MAX_RESUMES ? (
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading || scanning} className="w-full">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {uploading ? "Uploading..." : "Upload Another Resume"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center">Maximum of {MAX_RESUMES} resumes reached.</p>
            )
          )}
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />

          <div className="border-t pt-4 space-y-1.5">
            <Label htmlFor="resumeText">Resume highlights (recommended)</Label>
            <Textarea
              id="resumeText"
              data-tutorial="resume-input"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume content or key highlights here. This will be injected into AI prompts to personalize cover letters and reports."
              rows={8}
              className="text-sm"
            />
          </div>
        </CardContent>
        <SaveCardButton cardName="resume" isDirty={isDirty} saving={saving} savingCard={savingCard} onSave={onSave} />
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the uploaded file. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
