import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Upload, FileText, Trash2, Star, StarOff, AlertCircle,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Resume = Tables<"user_resumes">;

interface ResumeManagerProps {
  userId: string;
}

export default function ResumeManager({ userId }: ResumeManagerProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ["user_resumes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_resumes")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as Resume[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["user_resumes", userId] });

  // Upload handler
  const uploadResume = useCallback(async (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("resume-uploads")
        .upload(storagePath, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const isFirst = resumes.length === 0;

      const { error: dbErr } = await supabase.from("user_resumes").insert({
        user_id: userId,
        storage_path: storagePath,
        file_name: file.name,
        is_active: isFirst,
      });
      if (dbErr) throw dbErr;

      toast.success(`Uploaded ${file.name}`);
      invalidate();
    } catch (e: any) {
      toast.error("Upload failed: " + (e.message ?? "Unknown error"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [userId, resumes.length]);

  // Set primary
  const setPrimary = useMutation({
    mutationFn: async (resumeId: string) => {
      const { error } = await supabase.rpc("set_active_resume", { p_resume_id: resumeId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Primary resume updated"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete
  const deleteResume = useMutation({
    mutationFn: async (resume: Resume) => {
      // Delete from storage first
      await supabase.storage.from("resume-uploads").remove([resume.storage_path]);
      const { error } = await supabase.rpc("delete_and_reassign_resume", { p_resume_id: resume.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Resume deleted"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  // Drag & drop handlers
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadResume(file);
  }, [uploadResume]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadResume(file);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  const activeResume = resumes.find((r) => r.is_active);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Resumes
        </CardTitle>
        <CardDescription>
          Upload PDF resumes. The primary resume is used for generation unless overridden per application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer
            transition-colors duration-150
            ${dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40"
            }
          `}
        >
          <Upload className={`h-6 w-6 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-sm text-muted-foreground">
            {uploading ? "Uploading..." : "Drop a PDF here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground/60">Max 10 MB · PDF only</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {/* Resume list */}
        {resumes.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <AlertCircle className="h-4 w-4" />
            No resumes uploaded yet. Upload one to get started.
          </div>
        )}

        <div className="space-y-2">
          {resumes.map((r) => (
            <div
              key={r.id}
              className={`
                flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors
                ${r.is_active
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
                }
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{r.file_name}</span>
                {r.is_active && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0">
                    Primary
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!r.is_active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Set as primary"
                    disabled={setPrimary.isPending}
                    onClick={() => setPrimary.mutate(r.id)}
                  >
                    <StarOff className="h-3.5 w-3.5" />
                  </Button>
                )}
                {r.is_active && (
                  <Star className="h-3.5 w-3.5 text-primary mx-1.5" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive/70 hover:text-destructive"
                  title="Delete"
                  disabled={deleteResume.isPending}
                  onClick={() => deleteResume.mutate(r)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
