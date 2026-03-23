import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Edit3,
  Check,
  X,
  ExternalLink,
  FileText,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import type { JobApplication } from "@/types/models";

interface DetailsTabProps {
  app: any;
  companyName: string;
  setCompanyName: (val: string) => void;
  jobTitle: string;
  setJobTitle: (val: string) => void;
  companyUrl: string;
  setCompanyUrl: (val: string) => void;
  jobDescription: string;
  setJobDescription: (val: string) => void;
  editingMeta: boolean;
  setEditingMeta: (val: boolean) => void;
  saving: boolean;
  saveField: (fields: Record<string, any>) => Promise<void>;
}

export function DetailsTab({
  app,
  companyName,
  setCompanyName,
  jobTitle,
  setJobTitle,
  companyUrl,
  setCompanyUrl,
  jobDescription,
  setJobDescription,
  editingMeta,
  setEditingMeta,
  saving,
  saveField,
}: DetailsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Application Info</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditingMeta(!editingMeta)}>
              <Edit3 className="mr-2 h-4 w-4" /> {editingMeta ? "Cancel" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingMeta ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Job Title</label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company URL</label>
                <Input value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    saveField({ company_name: companyName, job_title: jobTitle, company_url: companyUrl });
                    setEditingMeta(false);
                  }}
                  disabled={saving}
                >
                  <Check className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setCompanyName(app.company_name || "");
                  setJobTitle(app.job_title || "");
                  setCompanyUrl(app.company_url || "");
                  setEditingMeta(false);
                }}>
                  <X className="mr-2 h-4 w-4" /> Discard
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <InfoRow label="Company" value={companyName} />
              <InfoRow label="Job Title" value={jobTitle} />
              <InfoRow label="Job URL" value={app.job_url} isLink />
              <InfoRow label="Company URL" value={companyUrl} isLink />
              <InfoRow label="Status" value={app.status} />
              <InfoRow label="Created" value={new Date(app.created_at).toLocaleDateString()} />
              <InfoRow label="Updated" value={new Date(app.updated_at).toLocaleDateString()} />
            </div>
          )}

          {/* Collapsible Job Description */}
          <Collapsible className="mt-4 border-t pt-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Job Description
              </span>
              <ChevronRightIcon className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="Paste or type the job description here…"
              />
              <Button
                size="sm"
                disabled={saving}
                onClick={() => saveField({ job_description_markdown: jobDescription })}
              >
                <Check className="mr-2 h-3.5 w-3.5" /> Save
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TagSection label="Products" items={app.products as string[] | null} />
          <TagSection label="Competitors" items={app.competitors as string[] | null} />
          <TagSection label="Customers" items={app.customers as string[] | null} />
          {app.branding && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Branding:</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">✓ Captured</Badge>
                {app.branding.colors && Object.entries(app.branding.colors).slice(0, 6).map(([key, val]) => (
                  <div
                    key={key}
                    className="h-5 w-5 rounded-full border"
                    style={{ backgroundColor: val as string }}
                    title={`${key}: ${val}`}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value?: string | null; isLink?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 truncate max-w-[300px]">
          {value} <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      ) : (
        <span className="text-sm">{value || "—"}</span>
      )}
    </div>
  );
}

function TagSection({ label, items }: { label: string; items: string[] | null }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div>
      <span className="text-sm font-medium text-muted-foreground">{label}:</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {list.length > 0 ? list.map((item, i) => (
          <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
        )) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </div>
    </div>
  );
}
