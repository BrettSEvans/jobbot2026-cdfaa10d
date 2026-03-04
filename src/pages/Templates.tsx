import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getTemplates, deleteTemplate, type DashboardTemplate } from "@/lib/api/templates";
import {
  LayoutTemplate,
  Trash2,
  Eye,
  Loader2,
  Search,
  ArrowLeft,
  X,
} from "lucide-react";
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
import ImpersonationNotice from "@/components/ImpersonationNotice";

const ASSET_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "dashboard", label: "Dashboard" },
  { value: "executive-report", label: "Executive Report" },
  { value: "raid-log", label: "RAID Log" },
  { value: "architecture-diagram", label: "Architecture" },
  { value: "roadmap", label: "Roadmap" },
];

const ASSET_TYPE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "executive-report": "Executive Report",
  "raid-log": "RAID Log",
  "architecture-diagram": "Architecture Diagram",
  roadmap: "Roadmap",
};

const Templates = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [allTemplates, setAllTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssetType, setFilterAssetType] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setAllTemplates(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for instant results
  const filtered = useMemo(() => {
    let results = allTemplates;

    if (filterAssetType) {
      results = results.filter((t) => t.asset_type === filterAssetType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.job_function.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q)
      );
    }

    return results;
  }, [allTemplates, searchQuery, filterAssetType]);

  // Count per asset type for badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const searchFiltered = searchQuery.trim()
      ? allTemplates.filter((t) => {
          const q = searchQuery.toLowerCase();
          return (
            t.label.toLowerCase().includes(q) ||
            t.job_function.toLowerCase().includes(q) ||
            t.department.toLowerCase().includes(q)
          );
        })
      : allTemplates;

    for (const t of searchFiltered) {
      counts[t.asset_type] = (counts[t.asset_type] || 0) + 1;
    }
    return counts;
  }, [allTemplates, searchQuery]);

  const hasActiveFilters = searchQuery.trim() !== "" || filterAssetType !== "";

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      setAllTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Deleted", description: "Template removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAssetType("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <ImpersonationNotice />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Asset Templates</h1>
              <p className="text-muted-foreground text-sm">
                {allTemplates.length} template{allTemplates.length !== 1 ? "s" : ""} saved
              </p>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {ASSET_TYPE_OPTIONS.map((opt) => {
              const count = opt.value ? typeCounts[opt.value] || 0 : Object.values(typeCounts).reduce((a, b) => a + b, 0);
              return (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={filterAssetType === opt.value ? "default" : "outline"}
                  onClick={() => setFilterAssetType(opt.value)}
                  className="text-xs gap-1.5"
                >
                  {opt.label}
                  <span className={filterAssetType === opt.value ? "text-primary-foreground/70" : "text-muted-foreground"}>
                    {count}
                  </span>
                </Button>
              );
            })}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                <X className="h-3 w-3 mr-1" /> Clear filters
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              {allTemplates.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium mb-2">No templates yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate an asset and save it as a template to get started.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-2">No matching templates</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search or filters.
                  </p>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{t.label}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="default" className="text-xs">
                          {ASSET_TYPE_LABELS[t.asset_type] || t.asset_type}
                        </Badge>
                        {t.job_function && (
                          <Badge variant="outline" className="text-xs">{t.job_function}</Badge>
                        )}
                        {t.department && (
                          <Badge variant="secondary" className="text-xs">{t.department}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewId(previewId === t.id ? null : t.id)}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete template?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "<strong>{t.label}</strong>". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(t.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {previewId === t.id && (
                    <div className="mt-4 border rounded-lg overflow-hidden" style={{ height: "60vh" }}>
                      <iframe
                        srcDoc={t.dashboard_html}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts"
                        title="Template Preview"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Templates;
