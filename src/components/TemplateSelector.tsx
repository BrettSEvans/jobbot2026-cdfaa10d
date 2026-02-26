import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTemplates, type DashboardTemplate } from "@/lib/api/templates";
import { LayoutTemplate, Search, Check, Loader2 } from "lucide-react";

interface TemplateSelectorProps {
  onSelect: (template: DashboardTemplate) => void;
}

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFunction, setSearchFunction] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) loadTemplates();
  }, [open, searchFunction, searchDepartment]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates({
        job_function: searchFunction || undefined,
        department: searchDepartment || undefined,
      });
      setTemplates(data);
    } catch (e) {
      console.error("Failed to load templates:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (template: DashboardTemplate) => {
    setSelectedId(template.id);
    onSelect(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LayoutTemplate className="mr-2 h-4 w-4" />
          {selectedId ? "Template Selected ✓" : "Use Template"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Choose a Dashboard Template
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Filter by job function..."
              value={searchFunction}
              onChange={(e) => setSearchFunction(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex-1">
            <Input
              placeholder="Filter by department..."
              value={searchDepartment}
              onChange={(e) => setSearchDepartment(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <LayoutTemplate className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No templates found. Save a dashboard as a template first.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <Card
                key={t.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedId === t.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => handleSelect(t)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{t.label}</h4>
                      <div className="flex gap-1 mt-1">
                        {t.job_function && <Badge variant="outline" className="text-xs">{t.job_function}</Badge>}
                        {t.department && <Badge variant="secondary" className="text-xs">{t.department}</Badge>}
                      </div>
                    </div>
                    {selectedId === t.id && <Check className="h-5 w-5 text-primary" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
