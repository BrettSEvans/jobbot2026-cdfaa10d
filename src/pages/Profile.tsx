import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, User, FileText, Zap, X } from "lucide-react";
import ResumeManager from "@/components/ResumeManager";

const EXPERIENCE_OPTIONS = ["0-1", "2-4", "5-9", "10-14", "15+"];
const COMMON_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "AWS", "Docker",
  "Project Management", "Data Analysis", "Marketing", "Sales", "Design", "Leadership",
];
const TONE_OPTIONS = ["professional", "conversational", "confident", "formal", "friendly"];

export default function Profile() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [experience, setExperience] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [tone, setTone] = useState("professional");
  const [masterCoverLetter, setMasterCoverLetter] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize form from profile data
  if (profile && !initialized) {
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setExperience(profile.years_experience ?? "");
    setResumeText(profile.resume_text ?? "");
    setSkills(profile.key_skills ?? []);
    setIndustries(profile.target_industries ?? []);
    setTone(profile.preferred_tone ?? "professional");
    setMasterCoverLetter(profile.master_cover_letter ?? "");
    setInitialized(true);
  }

  const toggleSkill = (skill: string) => {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };

  const addCustomSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        years_experience: experience || null,
        resume_text: resumeText || null,
        key_skills: skills.length > 0 ? skills : [],
        target_industries: industries.length > 0 ? industries : [],
        preferred_tone: tone || "professional",
        master_cover_letter: masterCoverLetter || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Profile saved!");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Profile
        </h1>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Years of Experience</Label>
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o} years</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume uploads */}
      {user && <ResumeManager userId={user.id} />}

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Key Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SKILLS.map((s) => (
              <Badge
                key={s}
                variant={skills.includes(s) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleSkill(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
          {skills.filter((s) => !COMMON_SKILLS.includes(s)).map((s) => (
            <Badge key={s} variant="default" className="text-xs gap-1 mr-1">
              {s} <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => toggleSkill(s)} />
            </Badge>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="Add custom skill..."
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
              className="text-sm"
            />
            <Button variant="outline" size="sm" onClick={addCustomSkill}>Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Master Cover Letter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Master Cover Letter</CardTitle>
          <CardDescription>A reusable base cover letter that gets tailored to each application</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={masterCoverLetter}
            onChange={(e) => setMasterCoverLetter(e.target.value)}
            rows={8}
            placeholder="Write your master cover letter template here..."
            className="text-sm"
          />
          {!masterCoverLetter && (
            <p className="text-xs text-amber-500 mt-2">
              💡 Add a master cover letter to improve the quality of generated cover letters
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
