import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb } from "lucide-react";
import SaveCardButton from "./SaveCardButton";

interface CoverLetterCardProps {
  masterCoverLetter: string;
  setMasterCoverLetter: (v: string) => void;
  isDirty: boolean;
  saving: boolean;
  savingCard: string | null;
  onSave: (cardName: string) => void;
  cardBorderClass: string;
}

export default function CoverLetterCard({
  masterCoverLetter,
  setMasterCoverLetter,
  isDirty,
  saving,
  savingCard,
  onSave,
  cardBorderClass,
}: CoverLetterCardProps) {
  return (
    <Card className={cardBorderClass}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Master Cover Letter
            <Badge variant="outline" className="text-xs font-normal">Optional</Badge>
          </CardTitle>
          {isDirty && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
              Unsaved
            </Badge>
          )}
        </div>
        <CardDescription>
          Paste or write your go-to cover letter. When provided, the AI uses your voice and style
          as a starting point instead of generating from scratch — making every tailored letter
          sound more like you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!masterCoverLetter.trim() && (
          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span>
              <strong className="text-foreground">Highly recommended.</strong>{" "}
              Adding a master cover letter helps the AI capture your unique voice,
              making each application feel personal rather than generic.
            </span>
          </div>
        )}
        <Textarea
          rows={10}
          placeholder="Dear Hiring Manager, I am writing to express my interest in…"
          value={masterCoverLetter}
          onChange={(e) => setMasterCoverLetter(e.target.value)}
        />
      </CardContent>
      <SaveCardButton
        cardName="coverLetter"
        isDirty={isDirty}
        saving={saving}
        savingCard={savingCard}
        onSave={onSave}
      />
    </Card>
  );
}
