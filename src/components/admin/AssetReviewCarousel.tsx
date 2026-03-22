import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Briefcase,
  Filter,
  SkipForward,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FlatAsset = {
  applicationId: string;
  assetType: string;
  filterType: string;
  assetId: string | null;
  assetName: string;
  html: string;
  companyName: string | null;
  jobTitle: string | null;
};

type RatingValue = "up" | "mid" | "down";

const ASSET_TYPE_LABELS: Record<string, string> = {
  dashboard_html: "Dashboard",
  executive_report_html: "Executive Report",
  raid_log_html: "RAID Log",
  architecture_diagram_html: "Architecture Diagram",
  roadmap_html: "Roadmap",
  generated_asset: "Custom Material",
};

function useAllAssets() {
  return useQuery({
    queryKey: ["admin_all_assets"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: apps, error: appErr } = await supabase
        .from("job_applications")
        .select(
          "id, company_name, job_title, dashboard_html, executive_report_html, raid_log_html, architecture_diagram_html, roadmap_html"
        )
        .order("created_at", { ascending: false });

      if (appErr) throw appErr;

      const { data: genAssets, error: genErr } = await supabase
        .from("generated_assets")
        .select("id, application_id, asset_name, html, generation_status");
      if (genErr) throw genErr;

      const appMap = new Map((apps ?? []).map((a) => [a.id, a]));
      const flat: FlatAsset[] = [];

      const inlineTypes = [
        { key: "dashboard_html", label: "Dashboard" },
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
              filterType: t.key,
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
          filterType: `generated_asset::${ga.asset_name}`,
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

/** Wrap plain-text cover letters in styled HTML */
function wrapCoverLetter(text: string): string {
  return `<!DOCTYPE html><html><head><style>
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.7;
           color: #1a1a1a; background: #fff; max-width: 680px; margin: 32px auto; padding: 24px; }
    p { margin-bottom: 1em; }
  </style></head><body>${text
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("")}</body></html>`;
}

type ReviewFilter = "all" | "unreviewed" | "up" | "mid" | "down";

function filterLabel(ft: string | undefined): string {
  if (!ft) return "Unknown";
  if (ASSET_TYPE_LABELS[ft]) return ASSET_TYPE_LABELS[ft];
  if (ft.startsWith("generated_asset::")) return ft.replace("generated_asset::", "");
  return ft;
}

/** For "mid" ratings we store JSON { pros, cons } in the notes field */
function parseMidNotes(raw: string | null): { pros: string; cons: string } {
  if (!raw) return { pros: "", cons: "" };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return { pros: parsed.pros ?? "", cons: parsed.cons ?? "" };
    }
  } catch {
    // not JSON — legacy plain text
  }
  return { pros: "", cons: "" };
}

function serializeMidNotes(pros: string, cons: string): string {
  return JSON.stringify({ pros, cons });
}

export default function AssetReviewCarousel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: assets, isLoading: assetsLoading } = useAllAssets();
  const { data: reviews } = useAssetReviews();
  const [idx, setIdx] = useState(0);
  const [notes, setNotes] = useState("");
  const [midPros, setMidPros] = useState("");
  const [midCons, setMidCons] = useState("");
  const [pendingRating, setPendingRating] = useState<RatingValue | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());

  // Build review map
  const reviewMap = useMemo(() => {
    const m = new Map<string, (typeof reviews extends (infer T)[] | undefined ? T : never)>();
    for (const r of reviews ?? []) {
      const k = `${r.application_id}::${r.asset_type}::${r.asset_id ?? "inline"}`;
      m.set(k, r);
    }
    return m;
  }, [reviews]);

  // Unique asset types for filter dropdown
  const allFilterTypes = useMemo(() => {
    if (!assets) return [];
    const s = new Set(assets.map((a) => a.filterType));
    return Array.from(s).sort();
  }, [assets]);

  // Filtered asset list
  const filtered = useMemo(() => {
    if (!assets) return [];
    return assets.filter((a) => {
      if (typeFilters.size > 0 && !typeFilters.has(a.filterType)) return false;
      if (reviewFilter === "all") return true;
      const rev = reviewMap.get(reviewKey(a));
      if (reviewFilter === "unreviewed") return !rev;
      if (reviewFilter === "up") return rev?.rating === "up";
      if (reviewFilter === "mid") return rev?.rating === "mid";
      if (reviewFilter === "down") return rev?.rating === "down";
      return true;
    });
  }, [assets, typeFilters, reviewFilter, reviewMap]);

  // Reset index when filters change
  useEffect(() => {
    setIdx(0);
  }, [typeFilters, reviewFilter]);

  const current = filtered[idx];
  const currentReview = current ? reviewMap.get(reviewKey(current)) : undefined;

  // Sync notes/rating when navigating
  useEffect(() => {
    if (currentReview) {
      const r = currentReview.rating as RatingValue;
      setPendingRating(["up", "mid", "down"].includes(r) ? r : null);
      if (r === "mid") {
        const parsed = parseMidNotes(currentReview.notes);
        setMidPros(parsed.pros);
        setMidCons(parsed.cons);
        setNotes("");
      } else {
        setNotes(currentReview.notes ?? "");
        setMidPros("");
        setMidCons("");
      }
    } else {
      setNotes("");
      setMidPros("");
      setMidCons("");
      setPendingRating(null);
    }
  }, [idx, currentReview]);

  const getNotesForSave = useCallback(
    (rating: RatingValue) => {
      if (rating === "mid") return serializeMidNotes(midPros, midCons);
      return notes;
    },
    [notes, midPros, midCons]
  );

  const saveMutation = useMutation({
    mutationFn: async ({ rating, notesVal }: { rating: RatingValue; notesVal: string }) => {
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
    (r: RatingValue) => {
      setPendingRating(r);
      saveMutation.mutate({ rating: r, notesVal: getNotesForSave(r) });
    },
    [getNotesForSave, saveMutation]
  );

  const handleSaveNotes = useCallback(() => {
    if (!pendingRating) {
      toast.info("Please rate the asset first");
      return;
    }
    saveMutation.mutate({ rating: pendingRating, notesVal: getNotesForSave(pendingRating) });
  }, [pendingRating, getNotesForSave, saveMutation]);

  const go = useCallback(
    (dir: -1 | 1) => {
      setIdx((prev) => Math.max(0, Math.min(filtered.length - 1, prev + dir)));
    },
    [filtered]
  );

  const skipToNextUnreviewed = useCallback(() => {
    const start = idx + 1;
    for (let i = start; i < filtered.length; i++) {
      if (!reviewMap.get(reviewKey(filtered[i]))) {
        setIdx(i);
        return;
      }
    }
    toast.info("No more unreviewed assets ahead");
  }, [idx, filtered, reviewMap]);

  // Stats
  const totalAssets = assets?.length ?? 0;
  const reviewedCount = (reviews ?? []).length;
  const upCount = (reviews ?? []).filter((r) => r.rating === "up").length;
  const midCount = (reviews ?? []).filter((r) => r.rating === "mid").length;
  const downCount = (reviews ?? []).filter((r) => r.rating === "down").length;
  const unreviewedCount = totalAssets - reviewedCount;
  const progressPct = totalAssets > 0 ? Math.round((reviewedCount / totalAssets) * 100) : 0;

  if (assetsLoading) return <Skeleton className="h-[500px] w-full" />;
  if (!assets || assets.length === 0)
    return (
      <p className="text-muted-foreground text-center py-12">
        No generated assets found in the database.
      </p>
    );

  // Build srcDoc
  const getSrcDoc = (asset: FlatAsset) => asset.html;

  // Dashboards and custom materials need allow-scripts for Chart.js, etc.
  const needsScripts = (asset: FlatAsset) =>
    ["dashboard_html", "roadmap_html", "architecture_diagram_html", "generated_asset"].includes(
      asset.assetType
    );

  return (
    <div className="space-y-4">
      {/* Progress + stats bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Review progress:{" "}
            <span className="font-semibold text-foreground">
              {reviewedCount}/{totalAssets}
            </span>{" "}
            ({progressPct}%)
          </span>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
              <ThumbsUp className="h-3 w-3" /> {upCount}
            </Badge>
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
              <Scale className="h-3 w-3" /> {midCount}
            </Badge>
            <Badge variant="outline" className="gap-1 text-red-600 border-red-300">
              <ThumbsDown className="h-3 w-3" /> {downCount}
            </Badge>
            <Badge variant="secondary">{unreviewedCount} remaining</Badge>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Asset types:
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant={typeFilters.size === 0 ? "default" : "outline"}
            className="h-7 text-xs px-2.5"
            onClick={() => setTypeFilters(new Set())}
          >
            All
          </Button>
          {allFilterTypes.map((ft) => {
            const active = typeFilters.has(ft);
            return (
              <Button
                key={ft}
                size="sm"
                variant={active ? "default" : "outline"}
                className="h-7 text-xs px-2.5"
                onClick={() => {
                  setTypeFilters((prev) => {
                    const next = new Set(prev);
                    if (next.has(ft)) next.delete(ft);
                    else next.add(ft);
                    return next;
                  });
                }}
              >
                {filterLabel(ft)}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Status:
          </div>
          <Select value={reviewFilter} onValueChange={(v) => setReviewFilter(v as ReviewFilter)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Review status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unreviewed">Unreviewed</SelectItem>
              <SelectItem value="up">👍 Approved</SelectItem>
              <SelectItem value="mid">⚖️ Mid</SelectItem>
              <SelectItem value="down">👎 Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={skipToNextUnreviewed}
          >
            <SkipForward className="h-3.5 w-3.5" /> Skip to unreviewed
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No assets match the current filters.
          </CardContent>
        </Card>
      ) : (
        <>
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
              <span className="text-xs text-muted-foreground">
                ({idx + 1}/{filtered.length})
              </span>
            </div>
            {currentReview && (
              <Badge
                variant={currentReview.rating === "up" ? "default" : currentReview.rating === "mid" ? "secondary" : "destructive"}
                className="text-[10px]"
              >
                {currentReview.rating === "up" ? "👍 Approved" : currentReview.rating === "mid" ? "⚖️ Mid" : "👎 Rejected"}
              </Badge>
            )}
          </div>

          {/* Preview iframe */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <iframe
                key={reviewKey(current)}
                srcDoc={getSrcDoc(current)}
                title="Asset preview"
                className="w-full border-0 bg-white"
                style={{ height: "600px" }}
                sandbox={
                  needsScripts(current)
                    ? "allow-scripts allow-same-origin"
                    : "allow-same-origin"
                }
              />
            </CardContent>
          </Card>

          {/* Navigation + rating */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={idx === 0}
              onClick={() => go(-1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={pendingRating === "up" ? "default" : "outline"}
                className={cn(
                  "gap-1",
                  pendingRating === "up" && "bg-green-600 hover:bg-green-700 text-white"
                )}
                onClick={() => handleRate("up")}
                disabled={saveMutation.isPending}
              >
                <ThumbsUp className="h-4 w-4" /> Good
              </Button>
              <Button
                size="sm"
                variant={pendingRating === "mid" ? "default" : "outline"}
                className={cn(
                  "gap-1",
                  pendingRating === "mid" && "bg-amber-500 hover:bg-amber-600 text-white"
                )}
                onClick={() => handleRate("mid")}
                disabled={saveMutation.isPending}
              >
                <Scale className="h-4 w-4" /> Mid
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

            <Button
              variant="outline"
              size="sm"
              disabled={idx === filtered.length - 1}
              onClick={() => go(1)}
              className="gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            {pendingRating === "mid" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-green-600">👍 Pros — What works well</label>
                  <Textarea
                    placeholder="Good layout, strong color palette, clear hierarchy..."
                    value={midPros}
                    onChange={(e) => setMidPros(e.target.value)}
                    rows={3}
                    className="border-green-200 focus-visible:ring-green-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-red-600">👎 Cons — Needs improvement</label>
                  <Textarea
                    placeholder="Font too small, chart labels overlap, spacing issues..."
                    value={midCons}
                    onChange={(e) => setMidCons(e.target.value)}
                    rows={3}
                    className="border-red-200 focus-visible:ring-red-400"
                  />
                </div>
              </div>
            ) : (
              <Textarea
                placeholder="Add notes about this asset (layout issues, good patterns, color problems, etc.)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveNotes}
              disabled={saveMutation.isPending}
            >
              Save Notes
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
