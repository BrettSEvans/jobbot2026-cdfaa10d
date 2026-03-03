import { useState, useEffect } from "react";
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
} from "lucide-react";

const ASSET_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "dashboard", label: "Dashboard" },
  { value: "executive-report", label: "Executive Report" },
  { value: "raid-log", label: "RAID Log" },
  { value: "architecture-diagram", label: "Architecture Diagram" },
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
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFunction, setSearchFunction] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [filterAssetType, setFilterAssetType] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates({
        job_function: searchFunction || undefined,
        department: searchDepartment || undefined,
        asset_type: filterAssetType || undefined,
      });
      setTemplates(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(loadTemplates, 300);
    return () => clearTimeout(timeout);
  }, [searchFunction, searchDepartment, filterAssetType]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Deleted", description: "Template removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Asset Templates</h1>
              <p className="text-muted-foreground text-sm">Saved templates for reuse across applications</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by job function..."
              value={searchFunction}
              onChange={(e) => setSearchFunction(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by department..."
              value={searchDepartment}
              onChange={(e) => setSearchDepartment(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {ASSET_TYPE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={filterAssetType === opt.value ? "default" : "outline"}
                onClick={() => setFilterAssetType(opt.value)}
                className="text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate an asset and save it as a template to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(t.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
