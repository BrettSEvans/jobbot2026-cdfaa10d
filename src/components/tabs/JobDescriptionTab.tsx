import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Edit3, Check, X } from "lucide-react";
import type { ApplicationState } from "@/hooks/useApplicationDetail";

interface JobDescriptionTabProps {
  state: ApplicationState;
}

export default function JobDescriptionTab({ state }: JobDescriptionTabProps) {
  const { app, jobDescription, setJobDescription, saveField, saving, handleCopy } = state;
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {jobDescription && (
          <Button variant="outline" size="sm" onClick={() => handleCopy(jobDescription, "Job description")}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
          <Edit3 className="mr-2 h-4 w-4" /> {editing ? "Cancel Edit" : "Edit"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {editing ? (
            <div className="space-y-3">
              <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={20} className="font-mono text-sm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { saveField({ job_description_markdown: jobDescription }); setEditing(false); }} disabled={saving}>
                  <Check className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setJobDescription(app.job_description_markdown || ""); setEditing(false); }}>
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
