import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, Plus, FileText, User, Briefcase, Sparkles } from "lucide-react";
import { getProfile, updateProfile, uploadResumePdf, type UserProfile } from "@/lib/api/profile";
import StylePreferencesCard from "@/components/StylePreferencesCard";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "executive", label: "Executive" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "concise", label: "Concise & Direct" },
];

const EXPERIENCE_OPTIONS = [
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (3-5 years)" },
  { value: "senior", label: "Senior (6-10 years)" },
  { value: "staff", label: "Staff / Principal (10-15 years)" },
  { value: "executive", label: "Executive (15+ years)" },
];

export default function Profile() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [preferredTone, setPreferredTone] = useState("professional");
  const [industries, setIndustries] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState("");
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const p = await getProfile();
      if (p) {
        setDisplayName(p.display_name || "");
        setResumeText(p.resume_text || "");
        setYearsExperience(p.years_experience || "");
        setPreferredTone(p.preferred_tone || "professional");
        setIndustries(p.target_industries || []);
        setSkills(p.key_skills || []);
      }
    } catch (err: any) {
      toast({ title: "Error loading profile", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName || null,
        resume_text: resumeText || null,
        years_experience: yearsExperience || null,
        target_industries: industries,
        key_skills: skills,
        preferred_tone: preferredTone,
      });
      toast({ title: "Profile saved", description: "Your preferences will personalize future AI outputs." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      await uploadResumePdf(file);

      // Read PDF as text (basic extraction via edge function could be added later)
      // For now, prompt user to paste key content
      toast({
        title: "Resume uploaded!",
        description: "PDF saved. For best results, also paste key highlights from your resume in the text box below.",
      });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addTag = (list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput("");
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">My Profile</h1>
          <p className="text-muted-foreground text-sm">
            Your background and preferences personalize cover letters and executive reports.
          </p>
        </div>

        {/* Identity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" />
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
        </Card>

        {/* Resume */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Resume / Background
            </CardTitle>
            <CardDescription>Upload a PDF or paste key highlights — this context personalizes your AI outputs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload PDF
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resumeText">Resume highlights (recommended)</Label>
              <Textarea
                id="resumeText"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume content or key highlights here. This will be injected into AI prompts to personalize cover letters and reports."
                rows={8}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills & Industries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Skills & Target Industries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Skills */}
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
                <Button variant="outline" size="sm" onClick={() => addTag(skills, setSkills, newSkill, setNewSkill)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Target Industries */}
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
                <Button variant="outline" size="sm" onClick={() => addTag(industries, setIndustries, newIndustry, setNewIndustry)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tone */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Writing Preferences
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
        </Card>

        {/* AI Style Memory */}
        <StylePreferencesCard />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
