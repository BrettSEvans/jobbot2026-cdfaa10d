import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { computeResumeDiff } from "@/lib/api/resumeDiff";
import type { ResumeDiff, DiffResponse, SectionDiff, BulletChange } from "@/lib/api/resumeDiff";
import {
  GitCompare,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  Plus,
  Minus,
  ArrowRightLeft,
  Search,
  Sparkles,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResumeDiffViewerProps {
  baselineText: string | null;
  tailoredHtml: string | null;
  jobDescription?: string;
  revisions?: Array<{ id: string; label: string; html: string; revision_number: number }>;
  onAcceptFabrication?: (change: BulletChange) => void;
  onRevertFabrication?: (change: BulletChange) => void;
}

const changeTypeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  keyword_injection: { label: "Keyword", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300", icon: <Search className="h-3 w-3" /> },
  quantification: { label: "Quantified", color: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-300", icon: <Sparkles className="h-3 w-3" /> },
  xyz_rewrite: { label: "XYZ Rewrite", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300", icon: <ArrowRightLeft className="h-3 w-3" /> },
  reordered: { label: "Reordered", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-300", icon: <ArrowRightLeft className="h-3 w-3" /> },
  removed: { label: "Removed", color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-300", icon: <Minus className="h-3 w-3" /> },
  added: { label: "Added", color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-300", icon: <Plus className="h-3 w-3" /> },
  rephrased: { label: "Rephrased", color: "bg-muted text-muted-foreground border-border", icon: <ArrowRightLeft className="h-3 w-3" /> },
};

const sectionStatusBadge: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  modified: { variant: "default", label: "Modified" },
  added: { variant: "default", label: "Added" },
  removed: { variant: "destructive", label: "Removed" },
  unchanged: { variant: "secondary", label: "Unchanged" },
  reordered: { variant: "outline", label: "Reordered" },
};

export default function ResumeDiffViewer({
  baselineText,
  tailoredHtml,
  jobDescription,
  revisions,
  onAcceptFabrication,
  onRevertFabrication,
}: ResumeDiffViewerProps) {
  const [diffResult, setDiffResult] = useState<DiffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [compareA, setCompareA] = useState<string>("baseline");
  const [compareB, setCompareB] = useState<string>("latest");
  const { toast } = useToast();

  const canDiff = !!baselineText && !!tailoredHtml;

  const handleComputeDiff = async () => {
    if (!baselineText || !tailoredHtml) return;

    // Resolve comparison sources
    let sourceA = baselineText;
    let sourceB = tailoredHtml;

    if (revisions && compareA !== "baseline") {
      const rev = revisions.find((r) => r.id === compareA);
      if (rev) sourceA = rev.html;
    }
    if (revisions && compareB !== "latest") {
      const rev = revisions.find((r) => r.id === compareB);
      if (rev) sourceB = rev.html;
    }

    setLoading(true);
    setShowDiff(true);
    try {
      const result = await computeResumeDiff({
        baselineText: sourceA,
        tailoredHtml: sourceB,
        jobDescriptionMarkdown: jobDescription,
      });
      setDiffResult(result);
    } catch (err: any) {
      toast({ title: "Diff failed", description: err.message, variant: "destructive" });
      setShowDiff(false);
    } finally {
      setLoading(false);
    }
  };

  if (!canDiff) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="outline" size="sm" disabled>
              <GitCompare className="mr-2 h-4 w-4" /> View Changes
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Upload a resume in your Profile to see changes</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showDiff ? "default" : "outline"}
          size="sm"
          onClick={showDiff && diffResult ? () => setShowDiff(false) : handleComputeDiff}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GitCompare className="mr-2 h-4 w-4" />
          )}
          {showDiff && diffResult ? "Hide Changes" : "View Changes"}
        </Button>

        {revisions && revisions.length > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <Select value={compareA} onValueChange={setCompareA}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baseline">Baseline Resume</SelectItem>
                {revisions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    v{r.revision_number} {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">vs</span>
            <Select value={compareB} onValueChange={setCompareB}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                {revisions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    v{r.revision_number} {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {showDiff && loading && (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Analyzing changes between resume versions…</p>
          </CardContent>
        </Card>
      )}

      {showDiff && diffResult && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <StatsBar stats={diffResult.diff.stats} trustScore={diffResult.trust_score} />

          {/* Change Summary */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm">{diffResult.diff.change_summary}</p>
              {diffResult.diff.what_kept && (
                <p className="text-xs text-muted-foreground">
                  <strong>What I kept:</strong> {diffResult.diff.what_kept}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Fabrication Review */}
          <FabricationReview
            sections={diffResult.diff.sections}
            onAccept={onAcceptFabrication}
            onRevert={onRevertFabrication}
          />

          {/* Section Diffs */}
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-3">
              {diffResult.diff.sections.map((section, i) => (
                <SectionDiffCard key={i} section={section} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function StatsBar({ stats, trustScore }: { stats: ResumeDiff["stats"]; trustScore: number }) {
  const statItems = [
    { label: "Modified", value: stats.bullets_modified, icon: <ArrowRightLeft className="h-3.5 w-3.5" />, color: "text-amber-600" },
    { label: "Keywords", value: stats.keywords_injected, icon: <Search className="h-3.5 w-3.5" />, color: "text-blue-600" },
    { label: "Added", value: stats.bullets_added, icon: <Plus className="h-3.5 w-3.5" />, color: "text-green-600" },
    { label: "Removed", value: stats.bullets_removed, icon: <Minus className="h-3.5 w-3.5" />, color: "text-red-600" },
    { label: "Reordered", value: stats.sections_reordered, icon: <ArrowRightLeft className="h-3.5 w-3.5" />, color: "text-cyan-600" },
  ];

  const TrustIcon = stats.fabrication_flags === 0 ? ShieldCheck : ShieldAlert;
  const trustColor = trustScore >= 95 ? "text-green-600" : trustScore >= 80 ? "text-amber-600" : "text-red-600";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statItems.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs">
          <span className={s.color}>{s.icon}</span>
          <span className="font-medium">{s.value}</span>
          <span className="text-muted-foreground">{s.label}</span>
        </div>
      ))}
      <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${trustColor}`}>
        <TrustIcon className="h-3.5 w-3.5" />
        <span className="font-bold">{trustScore}%</span>
        <span className="text-muted-foreground">Trust</span>
      </div>
      {stats.fabrication_flags > 0 && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-300 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="font-medium">{stats.fabrication_flags}</span>
          <span>Flags</span>
        </div>
      )}
    </div>
  );
}

function FabricationReview({
  sections,
  onAccept,
  onRevert,
}: {
  sections: SectionDiff[];
  onAccept?: (change: BulletChange) => void;
  onRevert?: (change: BulletChange) => void;
}) {
  const flags = sections.flatMap((s) =>
    s.changes.filter((c) => c.fabrication_risk).map((c) => ({ section: s.name, change: c }))
  );

  if (flags.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
        <ShieldCheck className="h-4 w-4" />
        <span className="font-medium">All Clear</span> — No fabrication detected
      </div>
    );
  }

  return (
    <Card className="border-red-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700 dark:text-red-400">
          <ShieldAlert className="h-4 w-4" />
          Fabrication Review ({flags.length} {flags.length === 1 ? "flag" : "flags"})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {flags.map((f, i) => (
          <div key={i} className="rounded-md border border-red-300 bg-red-500/5 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge variant="outline" className="text-xs mb-1">{f.section}</Badge>
                <p className="text-sm line-through text-muted-foreground">{f.change.baseline_text || "(nothing)"}</p>
                <p className="text-sm font-medium">{f.change.tailored_text}</p>
                {f.change.fabrication_reason && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{f.change.fabrication_reason}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {onAccept && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAccept(f.change)} title="Accept">
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                )}
                {onRevert && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRevert(f.change)} title="Revert">
                    <X className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SectionDiffCard({ section }: { section: SectionDiff }) {
  const [open, setOpen] = useState(section.status !== "unchanged");
  const badge = sectionStatusBadge[section.status] || sectionStatusBadge.unchanged;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="text-sm font-medium">{section.name}</CardTitle>
                <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                {section.changes.length > 0 && (
                  <span className="text-xs text-muted-foreground">{section.changes.length} changes</span>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {section.status === "unchanged" ? (
              <p className="text-xs text-muted-foreground italic">No changes in this section.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Baseline */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Baseline</p>
                  <div className="rounded-md border bg-red-500/5 p-2 text-xs whitespace-pre-wrap min-h-[40px]">
                    {section.baseline_content || <span className="italic text-muted-foreground">(empty)</span>}
                  </div>
                </div>
                {/* Tailored */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tailored</p>
                  <div className="rounded-md border bg-green-500/5 p-2 text-xs whitespace-pre-wrap min-h-[40px]">
                    {section.tailored_content || <span className="italic text-muted-foreground">(empty)</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Individual changes */}
            {section.changes.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t">
                {section.changes.map((change, j) => {
                  const config = changeTypeConfig[change.type] || changeTypeConfig.rephrased;
                  return (
                    <Tooltip key={j}>
                      <TooltipTrigger asChild>
                        <div className={`flex items-start gap-2 rounded-md border p-2 text-xs ${change.fabrication_risk ? "border-red-400 bg-red-500/5" : ""}`}>
                          <Badge variant="outline" className={`shrink-0 text-[10px] ${config.color}`}>
                            {config.icon}
                            <span className="ml-1">{config.label}</span>
                          </Badge>
                          <div className="flex-1 min-w-0">
                            {change.baseline_text && (
                              <p className="line-through text-muted-foreground">{change.baseline_text}</p>
                            )}
                            <p>{change.tailored_text}</p>
                          </div>
                          {change.fabrication_risk && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[300px]">
                        <p className="text-xs">{change.explanation}</p>
                        {change.fabrication_reason && (
                          <p className="text-xs text-red-400 mt-1">⚠️ {change.fabrication_reason}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
