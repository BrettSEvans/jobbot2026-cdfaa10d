import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import CompanyIcon from "@/components/CompanyIcon";
import { FileText, Eye, Copy, Trash2, MoreVertical, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { STAGE_LABELS, STAGE_COLORS, type PipelineStage } from "@/lib/pipelineStages";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { formatDistanceToNow } from "date-fns";
import type { JobApplication } from "@/hooks/useApplicationDetail";

const ASSET_FIELDS = [
  { key: "dashboard_html", label: "Dashboard", assetType: "dashboard" },
  { key: "cover_letter", label: "Cover Letter", assetType: "cover-letter" },
  { key: "executive_report_html", label: "Exec Report", assetType: "executive-report" },
  { key: "raid_log_html", label: "RAID Log", assetType: "raid-log" },
  { key: "architecture_diagram_html", label: "Architecture", assetType: "architecture-diagram" },
  { key: "roadmap_html", label: "Roadmap", assetType: "roadmap" },
] as const;

interface ApplicationCommandCardProps {
  app: JobApplication;
  onDelete: (id: string) => void;
  onCopyCoverLetter: (text: string, e: React.MouseEvent) => void;
  onCopyHtml: (html: string, e: React.MouseEvent) => void;
  onPreview: (id: string) => void;
}

export default function ApplicationCommandCard({
  app,
  onDelete,
  onCopyCoverLetter,
  onCopyHtml,
  onPreview,
}: ApplicationCommandCardProps) {
  const navigate = useNavigate();
  const activeTypes = backgroundGenerator.getActiveAssetTypesForApp(app.id);
  const stage = (app.pipeline_stage || "bookmarked") as PipelineStage;
  const atsScore = app.ats_score as unknown as { score?: number } | null;

  const completedAssets = ASSET_FIELDS.filter((f) => !!app[f.key as keyof typeof app]).length;
  const totalAssets = ASSET_FIELDS.length;
  const progressPercent = Math.round((completedAssets / totalAssets) * 100);

  const bgJob = backgroundGenerator.getJob(app.id);
  const isGenerating = bgJob && !["complete", "error"].includes(bgJob.status);

  return (
    <Card
      className="cursor-pointer group hover:shadow-[var(--shadow-warm)] transition-all duration-300 border-border/60"
      onClick={() => navigate(`/applications/${app.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header row: Logo + Company + Stage + ATS */}
        <div className="flex items-start gap-3">
          <CompanyIcon
            iconUrl={app.company_icon_url}
            companyName={app.company_name}
            size={48}
            className="rounded-lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-sm leading-tight truncate">
                  {app.company_name || "Unknown"}
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {app.job_title || "Unknown Role"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {atsScore?.score != null && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-5 font-semibold ${
                      atsScore.score >= 80
                        ? "border-green-500/50 text-green-700 dark:text-green-400"
                        : atsScore.score >= 50
                        ? "border-yellow-500/50 text-yellow-700 dark:text-yellow-400"
                        : "border-destructive/50 text-destructive"
                    }`}
                  >
                    ATS {atsScore.score}
                  </Badge>
                )}
                <Badge className={`text-[10px] px-1.5 py-0 h-5 ${STAGE_COLORS[stage] || "bg-muted text-muted-foreground"}`}>
                  {STAGE_LABELS[stage] || stage}
                </Badge>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Asset dots row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {ASSET_FIELDS.map((f) => {
            const has = !!app[f.key as keyof typeof app];
            const isActive = activeTypes.includes(f.assetType);
            return (
              <Tooltip key={f.key}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isActive
                          ? "bg-primary animate-pulse"
                          : has
                          ? "bg-primary"
                          : "bg-muted-foreground/25"
                      }`}
                    />
                    <span className={`text-[10px] ${has ? "text-foreground" : "text-muted-foreground/50"}`}>
                      {f.label}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {f.label}: {isActive ? "⏳ Generating..." : has ? "✓ Complete" : "— Pending"}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Progress bar + actions */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: "var(--gradient-warm)",
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {isGenerating ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Generating
              </span>
            ) : (
              `${completedAssets}/${totalAssets}`
            )}
          </span>

          {/* Context menu */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="More actions"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {app.cover_letter && (
                  <DropdownMenuItem onClick={(e) => onCopyCoverLetter(app.cover_letter, e as React.MouseEvent)}>
                    <FileText className="mr-2 h-3.5 w-3.5" /> Copy Cover Letter
                  </DropdownMenuItem>
                )}
                {app.dashboard_html && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(app.id); }}>
                      <Eye className="mr-2 h-3.5 w-3.5" /> Preview Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => onCopyHtml(app.dashboard_html, e as React.MouseEvent)}>
                      <Copy className="mr-2 h-3.5 w-3.5" /> Copy HTML
                    </DropdownMenuItem>
                  </>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Move to Trash
                    </DropdownMenuItem>
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
                      <AlertDialogAction
                        onClick={() => onDelete(app.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Move to Trash
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
