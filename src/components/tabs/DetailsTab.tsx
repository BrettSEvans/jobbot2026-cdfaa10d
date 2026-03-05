import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit3, Check, X, ExternalLink } from "lucide-react";
import type { ApplicationState } from "@/hooks/useApplicationDetail";
import CompanyIcon from "@/components/CompanyIcon";

interface DetailsTabProps {
  state: ApplicationState;
}

export default function DetailsTab({ state }: DetailsTabProps) {
  const { app, companyName, setCompanyName, jobTitle, setJobTitle, companyUrl, setCompanyUrl, saveField, saving } = state;
  const [editingMeta, setEditingMeta] = useState(false);

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
                <Button size="sm" onClick={() => { saveField({ company_name: companyName, job_title: jobTitle, company_url: companyUrl }); setEditingMeta(false); }} disabled={saving}>
                  <Check className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setCompanyName(app.company_name || ""); setJobTitle(app.job_title || ""); setCompanyUrl(app.company_url || ""); setEditingMeta(false); }}>
                  <X className="mr-2 h-4 w-4" /> Discard
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <InfoRow label="Company" value={companyName} iconUrl={(app as any).company_icon_url} />
              <InfoRow label="Job Title" value={jobTitle} />
              <InfoRow label="Job URL" value={app.job_url} isLink />
              <InfoRow label="Company URL" value={companyUrl} isLink />
              <InfoRow label="Status" value={app.status} />
              <InfoRow label="Created" value={new Date(app.created_at).toLocaleDateString()} />
              <InfoRow label="Updated" value={new Date(app.updated_at).toLocaleDateString()} />
            </div>
          )}
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
          {app.branding && typeof app.branding === 'object' && !Array.isArray(app.branding) && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Branding:</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">✓ Captured</Badge>
                {(app.branding as Record<string, any>).colors && Object.entries((app.branding as Record<string, any>).colors).slice(0, 6).map(([key, val]) => (
                  <div key={key} className="h-5 w-5 rounded-full border" style={{ backgroundColor: val as string }} title={`${key}: ${val}`} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, isLink, iconUrl }: { label: string; value?: string | null; isLink?: boolean; iconUrl?: string | null }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 truncate max-w-[300px]">
          {value} <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      ) : (
        <span className="text-sm flex items-center gap-2">
          {iconUrl !== undefined && <CompanyIcon iconUrl={iconUrl} companyName={value} size={24} />}
          {value || "—"}
        </span>
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
