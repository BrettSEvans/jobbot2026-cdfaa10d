import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Copy,
  Edit3,
  Check,
  X,
  FileText,
  Globe,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import JDIntelligencePanel from "@/components/JDIntelligencePanel";
import SummaryPreview from "@/components/SummaryPreview";
import { saveJobApplication } from "@/lib/api/jobApplication";

interface JDAnalysisTabProps {
  id: string;
  app: any;
  setApp: (fn: any) => void;
  jobDescription: string;
  setJobDescription: (val: string) => void;
  editingJobDescription: boolean;
  setEditingJobDescription: (val: boolean) => void;
  companyUrl: string;
  setCompanyUrl: (val: string) => void;
  companyName: string;
  jobTitle: string;
  resumeText: string | null;
  saving: boolean;
  saveField: (fields: Record<string, any>) => Promise<void>;
  handleCopy: (text: string, label: string) => Promise<void>;
  toast: (opts: any) => void;
}

export function JDAnalysisTab({
  id,
  app,
  setApp,
  jobDescription,
  setJobDescription,
  editingJobDescription,
  setEditingJobDescription,
  companyUrl,
  setCompanyUrl,
  companyName,
  jobTitle,
  resumeText,
  saving,
  saveField,
  handleCopy,
  toast,
}: JDAnalysisTabProps) {
  return (
    <div className="space-y-4">
      {/* Collapsible Job & Company URL fields */}
      <Collapsible defaultOpen={false}>
        <Card className="border-dashed">
          <CardContent className="pt-3 pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Job &amp; Company URLs
              </span>
              <ChevronRightIcon className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Job URL / Pasted Text</label>
                <Input
                  value={app?.job_url || ""}
                  readOnly
                  className="text-sm bg-muted/40"
                  placeholder="No job URL"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Company URL</label>
                <div className="flex gap-2">
                  <Input
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    className="text-sm"
                    placeholder="https://company.com"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => saveField({ company_url: companyUrl })}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>

      {/* Empty state for JD tools */}
      {!jobDescription ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-medium">No job description available</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add a job description below to unlock JD Intelligence, keyword analysis, and summary preview tools.
            </p>
            <Button variant="outline" size="sm" onClick={() => setEditingJobDescription(true)}>
              <Edit3 className="mr-2 h-4 w-4" /> Add Job Description
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <JDIntelligencePanel
            jobDescription={jobDescription}
            companyName={companyName}
            jdIntelligence={app?.jd_intelligence}
            onParsed={async (intelligence) => {
              try {
                await saveJobApplication({ id, job_url: app.job_url, jd_intelligence: intelligence } as any);
                setApp((prev: any) => ({ ...prev, jd_intelligence: intelligence }));
              } catch (e) {
                console.warn("Failed to save JD intelligence:", e);
              }
            }}
          />

          <SummaryPreview
            jobDescription={jobDescription}
            resumeText={resumeText}
            companyName={companyName}
            jobTitle={jobTitle}
            onApprove={() => {
              toast({ title: "Summary approved", description: "Ready for full resume generation with your summary." });
            }}
          />
        </>
      )}

      {/* JD text editor */}
      <div className="flex flex-wrap gap-2">
        {jobDescription && (
          <Button variant="outline" size="sm" onClick={() => handleCopy(jobDescription, "Job description")}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditingJobDescription(!editingJobDescription)}>
          <Edit3 className="mr-2 h-4 w-4" /> {editingJobDescription ? "Cancel Edit" : "Edit"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {editingJobDescription ? (
            <div className="space-y-3">
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    saveField({ job_description_markdown: jobDescription });
                    setEditingJobDescription(false);
                  }}
                  disabled={saving}
                >
                  <Check className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setJobDescription(app.job_description_markdown || "");
                    setEditingJobDescription(false);
                  }}
                >
                  <X className="mr-2 h-4 w-4" /> Discard
                </Button>
              </div>
            </div>
          ) : jobDescription ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
              {jobDescription}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No job description saved.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
