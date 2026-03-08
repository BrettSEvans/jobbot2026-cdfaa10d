import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import SaveCardButton from "./SaveCardButton";
import { TONE_OPTIONS } from "./profileTypes";

interface ToneCardProps {
  preferredTone: string;
  setPreferredTone: (v: string) => void;
  isDirty: boolean;
  saving: boolean;
  savingCard: string | null;
  onSave: (cardName: string) => void;
  cardBorderClass: string;
}

export default function ToneCard({
  preferredTone, setPreferredTone,
  isDirty, saving, savingCard, onSave, cardBorderClass,
}: ToneCardProps) {
  return (
    <Card className={`transition-all ${cardBorderClass}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Writing Preferences
          {isDirty && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Unsaved</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          <Label>Preferred Tone</Label>
          <Select value={preferredTone} onValueChange={setPreferredTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Controls the writing style of cover letters and executive reports.</p>
        </div>
      </CardContent>
      <SaveCardButton cardName="tone" isDirty={isDirty} saving={saving} savingCard={savingCard} onSave={onSave} />
    </Card>
  );
}
