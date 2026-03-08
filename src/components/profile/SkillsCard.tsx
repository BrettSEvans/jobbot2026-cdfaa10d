import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Plus, X } from "lucide-react";
import SaveCardButton from "./SaveCardButton";

interface SkillsCardProps {
  skills: string[];
  setSkills: (v: string[]) => void;
  newSkill: string;
  setNewSkill: (v: string) => void;
  industries: string[];
  setIndustries: (v: string[]) => void;
  newIndustry: string;
  setNewIndustry: (v: string) => void;
  isDirty: boolean;
  saving: boolean;
  savingCard: string | null;
  onSave: (cardName: string) => void;
  cardBorderClass: string;
}

function addTag(list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) {
  const trimmed = value.trim();
  if (trimmed && !list.includes(trimmed)) {
    setList([...list, trimmed]);
  }
  setInput("");
}

function removeTag(list: string[], setList: (v: string[]) => void, idx: number) {
  setList(list.filter((_, i) => i !== idx));
}

export default function SkillsCard({
  skills, setSkills, newSkill, setNewSkill,
  industries, setIndustries, newIndustry, setNewIndustry,
  isDirty, saving, savingCard, onSave, cardBorderClass,
}: SkillsCardProps) {
  return (
    <Card className={`transition-all ${cardBorderClass}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" /> Skills & Target Industries
          {isDirty && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Unsaved</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Key Skills & Strengths</Label>
          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            {skills.map((s, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {s}
                <button onClick={() => removeTag(skills, setSkills, i)} className="ml-0.5 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="e.g. Program Management"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(skills, setSkills, newSkill, setNewSkill))}
              className="flex-1"
            />
            <Button variant="outline" className="h-10 w-10 p-0 shrink-0" onClick={() => addTag(skills, setSkills, newSkill, setNewSkill)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Target Industries</Label>
          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            {industries.map((ind, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {ind}
                <button onClick={() => removeTag(industries, setIndustries, i)} className="ml-0.5 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              placeholder="e.g. Fintech"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(industries, setIndustries, newIndustry, setNewIndustry))}
              className="flex-1"
            />
            <Button variant="outline" className="h-10 w-10 p-0 shrink-0" onClick={() => addTag(industries, setIndustries, newIndustry, setNewIndustry)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
      <SaveCardButton cardName="skills" isDirty={isDirty} saving={saving} savingCard={savingCard} onSave={onSave} />
    </Card>
  );
}
