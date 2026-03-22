import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FlatAsset = {
  applicationId: string;
  assetType: string;
  assetId: string | null;
  assetName: string;
  html: string;
  companyName: string | null;
  jobTitle: string | null;
};

function useAllAssets() {
  return useQuery({
    queryKey: ["admin_all_assets"],
    staleTime: 30_000,
    queryFn: async () => {
      // Fetch job_applications with inline HTML assets
      const { data: apps, error: appErr } = await supabase
        .from("job_applications")
        .select("id, company_name, job_title, dashboard_html, cover_letter, resume_html, executive_report_html, raid_log_html, architecture_diagram_html, roadmap_html")
        .order("created_at", { ascending: false });

      if (appErr) throw appErr;

      // Fetch generated_assets
      const { data: genAssets, error: genErr } = await supabase
        .from("generated_assets")
        .select("id, application_id, asset_name, html, generation_status");
      if (genErr) throw genErr;

      // Get company/job info for generated assets
      const appMap = new Map((apps ?? []).map((a) => [a.id, a]));

      const flat: FlatAsset[] = [];

      const inlineTypes = [
        { key: "dashboard_html", label: "Dashboard" },
        { key: "cover_letter", label: "Cover Letter" },
        { key: "resume_html", label: "Resume" },
        { key: "executive_report_html", label: "Executive Report" },
        { key: "raid_log_html", label: "RAID Log" },
        { key: "architecture_diagram_html", label: "Architecture Diagram" },
        { key: "roadmap_html", label: "Roadmap" },
      ] as const;

      for (const app of apps ?? []) {
        for (const t of inlineTypes) {
          const html = (app as any)[t.key] as string | null;
          if (html && html.trim().length > 20) {
            flat.push({
              applicationId: app.id,
              assetType: t.key,
              assetId: null,
              assetName: t.label,
              html,
              companyName: app.company_name,
              jobTitle: app.job_title,
            });
          }
        }
      }

      for (const ga of genAssets ?? []) {
        if (ga.generation_status !== "done" || !ga.html || ga.html.trim().length < 20) continue;
        const parent = appMap.get(ga.application_id);
        flat.push({
          applicationId: ga.application_id,
          assetType: "generated_asset",
          assetId: ga.id,
          assetName: ga.asset_name,
          html: ga.html,
          companyName: parent?.company_name ?? null,
          jobTitle: parent?.job_title ?? null,
        });
      }

      return flat;
    },
  });
}

function useAssetReviews() {
  return useQuery({
    queryKey: ["admin_asset_reviews"],
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("asset_reviews").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function reviewKey(a: FlatAsset) {
  return `${a.applicationId}::${a.assetType}::${a.assetId ?? "inline"}`;
}

export default function AssetReviewCarousel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: assets, isLoading: assetsLoading } = useAllAssets();
  const { data: reviews } = useAssetReviews();
  const [idx, setIdx] = useState(0);
  const [notes, setNotes] = useState("");
  const [pendingRating, setPendingRating] = useState<"up" | "down" | null>(null);

  const reviewMap = useMemo(() => {
    const m = new Map<string, (typeof reviews extends (infer T)[] | undefined ? T : never)>();
    for (const r of reviews ?? []) {
      const k = `${r.application_id}::${r.asset_type}::${r.asset_id ?? "inline"}`;
      m.set(k, r);
    }
    return m;
  }, [reviews]);

  const current = assets?.[idx];
  const currentReview = current ? reviewMap.get(reviewKey(current)) : undefined;

  // sync notes/rating when navigating
  useEffect(() => {
    if (currentReview) {
      setNotes(currentReview.notes ?? "");
      setPendingRating(currentReview.rating === "up" ? "up" : currentReview.rating === "down" ? "down" : null);
    } else {
      setNotes("");
      setPendingRating(null);
    }
  }, [idx, currentReview]);

  const saveMutation = useMutation({
    mutationFn: async ({ rating, notesVal }: { rating: "up" | "down"; notesVal: string }) => {
      if (!current || !user) return;
      const existing = reviewMap.get(reviewKey(current));
      if (existing) {
        const { error } = await supabase
          .from("asset_reviews")
          .update({ rating, notes: notesVal, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("asset_reviews").insert({
          reviewer_id: user.id,
          application_id: current.applicationId,
          asset_type: current.assetType,
          asset_id: current.assetId,
          rating,
          notes: notesVal,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Review saved");
      qc.invalidateQueries({ queryKey: ["admin_asset_reviews"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleRate = useCallback(
    (r: "up" | "down") => {
      setPendingRating(r);
      saveMutation.mutate({ rating: r, notesVal: notes });
    },
    [notes, saveMutation],
  );

  const handleSaveNotes = useCallback(() => {
    if (!pendingRating) {
      toast.info("Please rate thumbs up or down first");
      return;
    }
    saveMutation.mutate({ rating: pendingRating, notesVal: notes });
  }, [pendingRating, notes, saveMutation]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!assets) return;
      setIdx((prev) => Math.max(0, Math.min(assets.length - 1, prev + dir)));
    },
    [assets],
  );

  // Stats
  const upCount = (reviews ?? []).filter((r) => r.rating === "up").length;
  const downCount = (reviews ?? []).filter((r) => r.rating === "down").length;

  if (assetsLoading) return <Skeleton className="h-[500px] w-full" />;
  if (!assets || assets.length === 0) return <p className="text-muted-foreground text-center py-12">No generated assets found in the database.</p>;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Asset <span className="font-semibold text-foreground">{idx + 1}</span> of{" "}
          <span className="font-semibold text-foreground">{assets.length}</span>
        </span>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
            <ThumbsUp className="h-3 w-3" /> {upCount}
          </Badge>
          <Badge variant="outline" className="gap-1 text-red-600 border-red-300">
            <ThumbsDown className="h-3 w-3" /> {downCount}
          </Badge>
          <Badge variant="secondary">{(reviews ?? []).length} reviewed</Badge>
        </div>
      </div>

      {/* Header for current asset */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Badge>{current.assetName}</Badge>
          {current.companyName && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Building2 className="h-3 w-3 shrink-0" /> {current.companyName}
            </span>
          )}
          {current.jobTitle && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Briefcase className="h-3 w-3 shrink-0" /> {current.jobTitle}
            </span>
          )}
        </div>
        {currentReview && (
          <Badge
            variant={currentReview.rating === "up" ? "default" : "destructive"}
            className="text-[10px]"
          >
            {currentReview.rating === "up" ? "👍 Approved" : "👎 Rejected"}
          </Badge>
        )}
      </div>

      {/* Preview iframe */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <iframe
            srcDoc={current.html}
            title="Asset preview"
            className="w-full border-0"
            style={{ height: "600px" }}
            sandbox="allow-same-origin"
          />
        </CardContent>
      </Card>

      {/* Navigation + rating */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => go(-1)} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={pendingRating === "up" ? "default" : "outline"}
            className={cn("gap-1", pendingRating === "up" && "bg-green-600 hover:bg-green-700 text-white")}
            onClick={() => handleRate("up")}
            disabled={saveMutation.isPending}
          >
            <ThumbsUp className="h-4 w-4" /> Good
          </Button>
          <Button
            size="sm"
            variant={pendingRating === "down" ? "destructive" : "outline"}
            className="gap-1"
            onClick={() => handleRate("down")}
            disabled={saveMutation.isPending}
          >
            <ThumbsDown className="h-4 w-4" /> Poor
          </Button>
        </div>

        <Button variant="outline" size="sm" disabled={idx === assets.length - 1} onClick={() => go(1)} className="gap-1">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Textarea
          placeholder="Add notes about this asset (layout issues, good patterns, color problems, etc.)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
        <Button size="sm" variant="secondary" onClick={handleSaveNotes} disabled={saveMutation.isPending}>
          Save Notes
        </Button>
      </div>
    </div>
  );
}
