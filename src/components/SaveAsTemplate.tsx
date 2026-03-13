import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveTemplate } from "@/lib/api/templates";
import { useToast } from "@/hooks/use-toast";
import { LayoutTemplate, Loader2 } from "lucide-react";

interface SaveAsTemplateProps {
  dashboardHtml: string;
  applicationId?: string;
  defaultLabel?: string;
  defaultJobFunction?: string;
  defaultDepartment?: string;
}

export default function SaveAsTemplate({
  dashboardHtml,
  applicationId,
  defaultLabel = "",
  defaultJobFunction = "",
  defaultDepartment = "",
}: SaveAsTemplateProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(defaultLabel);
  const [jobFunction, setJobFunction] = useState(defaultJobFunction);
  const [department, setDepartment] = useState(defaultDepartment);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await saveTemplate({
        label: label.trim(),
        job_function: jobFunction.trim(),
        department: department.trim(),
        dashboard_html: dashboardHtml,
        source_application_id: applicationId,
      });
      toast({ title: "Template saved!", description: `"${label}" is now available as a template.` });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LayoutTemplate className="mr-2 h-4 w-4" /> Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Dashboard as Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Template Name *</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Enterprise SaaS Sales Dashboard" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Job Function</label>
            <Input value={jobFunction} onChange={(e) => setJobFunction(e.target.value)} placeholder="e.g. Account Executive, Product Manager" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Department</label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Sales, Marketing, Engineering" />
          </div>
          <Button onClick={handleSave} disabled={!label.trim() || saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LayoutTemplate className="mr-2 h-4 w-4" />}
            Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
