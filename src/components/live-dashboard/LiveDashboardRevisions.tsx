import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLiveDashboardRevisions, saveLiveDashboardRevision } from "@/lib/api/liveDashboardRevisions";
import { supabase } from "@/integrations/supabase/client";
import { History, Eye, Rocket, ChevronDown, Loader2, Copy } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard/schema";
import type { ToastFn } from "@/types/models";

interface LiveDashboardRevisionsProps {
  liveDashboardId: string;
  applicationId: string;
  currentData: DashboardData;
  onPreview: (data: DashboardData) => void;
  onClearPreview: () => void;
  toast: ToastFn;
}

export default function LiveDashboardRevisions({
  liveDashboardId,
  applicationId,
  currentData,
  onPreview,
  onClearPreview,
  toast,
}: LiveDashboardRevisionsProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ["live-dashboard-revisions", liveDashboardId],
    enabled: !!liveDashboardId && open,
    queryFn: () => getLiveDashboardRevisions(liveDashboardId),
  });

  const deployMutation = useMutation({
    mutationFn: async (revision: { dashboard_data: DashboardData; revision_number: number }) => {
      const { error } = await supabase
        .from("live_dashboards")
        .update({
          dashboard_data: revision.dashboard_data as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", liveDashboardId);
      if (error) throw error;

      // Save current as a new revision before deploying
      await saveLiveDashboardRevision(
        liveDashboardId,
        applicationId,
        revision.dashboard_data,
        "deploy",
        `Deployed v${revision.revision_number}`,
      );
    },
    onSuccess: () => {
      setPreviewingId(null);
      onClearPreview();
      queryClient.invalidateQueries({ queryKey: ["live-dashboard-admin", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["live-dashboard-revisions", liveDashboardId] });
      toast({ title: "Version deployed", description: "The selected version is now live." });
    },
    onError: (err: any) => {
      toast({ title: "Deploy failed", description: err.message, variant: "destructive" });
    },
  });

  const handlePreview = (rev: any) => {
    if (previewingId === rev.id) {
      setPreviewingId(null);
      onClearPreview();
    } else {
      setPreviewingId(rev.id);
      onPreview(rev.dashboard_data);
    }
  };

  const copyVersionId = (id: string) => {
    navigator.clipboard.writeText(id.slice(0, 8));
    toast({ title: "Copied", description: `Version ID ${id.slice(0, 8)} copied to clipboard.` });
  };

  const sourceLabel = (source: string) => {
    switch (source) {
      case "publish": return "Published";
      case "regenerate": return "Regenerated";
      case "vibe-edit": return "Vibe Edit";
      case "deploy": return "Deployed";
      default: return source;
    }
  };

  const sourceVariant = (source: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (source) {
      case "publish": return "default";
      case "regenerate": return "secondary";
      case "vibe-edit": return "outline";
      case "deploy": return "default";
      default: return "secondary";
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 w-full justify-between">
          <span className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Version History
            {revisions.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{revisions.length}</Badge>
            )}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : revisions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            No versions saved yet. Publish, regenerate, or vibe-edit to create versions.
          </p>
        ) : (
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-1.5">
              {revisions.map((rev) => (
                <div
                  key={rev.id}
                  className={`flex items-center gap-2 p-2 rounded-md border text-sm transition-colors ${
                    previewingId === rev.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  {/* Version number + ID */}
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs shrink-0 font-mono">
                        v{rev.revision_number}
                      </Badge>
                      <button
                        onClick={() => copyVersionId(rev.id)}
                        className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0"
                        title="Click to copy version ID"
                      >
                        #{rev.id.slice(0, 8)}
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                      <Badge variant={sourceVariant(rev.source)} className="text-[10px] shrink-0">
                        {sourceLabel(rev.source)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">{rev.label}</span>
                      <span className="shrink-0">
                        {new Date(rev.created_at).toLocaleDateString()}{" "}
                        {new Date(rev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant={previewingId === rev.id ? "default" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handlePreview(rev)}
                      title={previewingId === rev.id ? "Exit preview" : "Preview this version"}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deployMutation.mutate({ dashboard_data: rev.dashboard_data, revision_number: rev.revision_number })}
                      disabled={deployMutation.isPending}
                      title="Deploy this version"
                    >
                      {deployMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Rocket className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
