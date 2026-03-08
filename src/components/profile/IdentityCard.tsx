import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import SaveCardButton from "./SaveCardButton";
import { EXPERIENCE_OPTIONS } from "./profileTypes";

interface IdentityCardProps {
  firstName: string;
  setFirstName: (v: string) => void;
  middleName: string;
  setMiddleName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  yearsExperience: string;
  setYearsExperience: (v: string) => void;
  isDirty: boolean;
  saving: boolean;
  savingCard: string | null;
  onSave: (cardName: string) => void;
  cardBorderClass: string;
}

export default function IdentityCard({
  firstName, setFirstName, middleName, setMiddleName,
  lastName, setLastName, displayName, setDisplayName,
  yearsExperience, setYearsExperience,
  isDirty, saving, savingCard, onSave, cardBorderClass,
}: IdentityCardProps) {
  return (
    <Card className={`transition-all ${cardBorderClass}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> Identity
          {isDirty && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Unsaved</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="middleName">Middle Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Middle name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How you'd like to be referred to" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="experience">Experience Level</Label>
          <Select value={yearsExperience} onValueChange={setYearsExperience}>
            <SelectTrigger>
              <SelectValue placeholder="Select your experience level" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <SaveCardButton cardName="identity" isDirty={isDirty} saving={saving} savingCard={savingCard} onSave={onSave} />
    </Card>
  );
}
