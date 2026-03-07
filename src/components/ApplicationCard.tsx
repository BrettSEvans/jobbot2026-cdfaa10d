/**
 * Mobile-friendly card view for a single job application.
 * Shown below the `md` breakpoint as a replacement for table rows.
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import CompanyIcon from "@/components/CompanyIcon";
import { FileText, Eye, Copy, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { JobApplication } from "@/hooks/useApplicationDetail";

interface ApplicationCardProps {
  app: JobApplication;
  onDelete: (id: string) => void;
  onCopyCoverLetter: (text: string, e: React.MouseEvent) => void;
  onCopyHtml: (html: string, e: React.MouseEvent) => void;
  onPreview: (id: string) => void;
  statusCell: React.ReactNode;
}

export default function ApplicationCard({
  app,
  onDelete,
  onCopyCoverLetter,
  onCopyHtml,
  onPreview,
  statusCell,
}: ApplicationCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/applications/${app.id}`)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CompanyIcon iconUrl={(app as any).company_icon_url} companyName={app.company_name} size={24} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{app.company_name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground truncate">{app.job_title || "Unknown Role"}</p>
            </div>
          </div>
          {statusCell}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(app.created_at).toLocaleDateString()}</span>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {app.cover_letter && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Copy cover letter" onClick={(e) => onCopyCoverLetter(app.cover_letter, e)}>
                <FileText className="h-3.5 w-3.5" />
              </Button>
            )}
            {app.dashboard_html && (
              <>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Preview" onClick={(e) => { e.stopPropagation(); onPreview(app.id); }}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Copy HTML" onClick={(e) => onCopyHtml(app.dashboard_html, e)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{app.company_name || "This application"}</strong> will be moved to trash.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(app.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Move to Trash
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
