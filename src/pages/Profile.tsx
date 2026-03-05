import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, Plus, FileText, User, Briefcase, Sparkles, Save, Shield, Trash2, Pencil, Star, Check } from "lucide-react";
import { getProfile, updateProfile, uploadResumePdf, listUserResumes, setActiveResume, renameResume, deleteResume, type UserProfile, type UserResume } from "@/lib/api/profile";
import { updateTestUser } from "@/lib/api/testUsers";
import StylePreferencesCard from "@/components/StylePreferencesCard";
import TestUserManager from "@/components/TestUserManager";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

// ---------- Resume PDF Drop Zone ----------

function ResumeDropZone({
  fileRef,
  uploading,
  onFileSelected,
}: {
  fileRef: React.RefObject<HTMLInputElement>;
  uploading: boolean;
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    // Simulate a file input change by setting files on the hidden input
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileRef.current) {
      fileRef.current.files = dt.files;
      fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && fileRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors
        ${dragOver
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
        }
        ${uploading ? "pointer-events-none opacity-60" : ""}
      `}
    >
      <input ref={fileRef} type="file" accept=".pdf" onChange={onFileSelected} className="hidden" />
      {uploading ? (
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {uploading ? "Uploading..." : "Drag & drop your resume here"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or <span className="text-primary font-medium underline underline-offset-2">click to browse</span> · PDF only · 5 MB max
        </p>
      </div>
    </div>
  );
}

// ---------- Profile Page ----------

export default function Profile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = useAdminRole();
  const { activePersona, isImpersonating, refreshRoot, updateActivePersona } = useImpersonation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCard, setSavingCard] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Current values
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [preferredTone, setPreferredTone] = useState("professional");
  const [industries, setIndustries] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState("");
  const [newSkill, setNewSkill] = useState("");

  // Saved values (snapshot from last load/save)
  const [saved, setSaved] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    displayName: "",
    resumeText: "",
    yearsExperience: "",
    preferredTone: "professional",
    industries: [] as string[],
    skills: [] as string[],
  });

  // Compute dirty state per card
  const dirty = useMemo(() => ({
    identity: firstName !== saved.firstName || middleName !== saved.middleName || lastName !== saved.lastName || displayName !== saved.displayName || yearsExperience !== saved.yearsExperience,
    resume: resumeText !== saved.resumeText,
    skills: JSON.stringify(skills) !== JSON.stringify(saved.skills) || JSON.stringify(industries) !== JSON.stringify(saved.industries) || newSkill.trim() !== "" || newIndustry.trim() !== "",
    tone: preferredTone !== saved.preferredTone,
  }), [displayName, resumeText, yearsExperience, preferredTone, industries, skills, saved, newSkill, newIndustry, middleName, firstName, lastName]);

  const hasUnsavedChanges = dirty.identity || dirty.resume || dirty.skills || dirty.tone;

  // Populate form fields from a persona object
  const populateFromPersona = useCallback((p: {
    first_name?: string | null; middle_name?: string | null; last_name?: string | null;
    display_name?: string | null; resume_text?: string | null; years_experience?: string | null;
    preferred_tone?: string | null; target_industries?: string[] | null; key_skills?: string[] | null;
  }) => {
    const vals = {
      firstName: p.first_name || "",
      middleName: p.middle_name || "",
      lastName: p.last_name || "",
      displayName: p.display_name || "",
      resumeText: p.resume_text || "",
      yearsExperience: p.years_experience || "",
      preferredTone: p.preferred_tone || "professional",
      industries: p.target_industries || [],
      skills: p.key_skills || [],
    };
    setFirstName(vals.firstName);
    setMiddleName(vals.middleName);
    setLastName(vals.lastName);
    setDisplayName(vals.displayName);
    setResumeText(vals.resumeText);
    setYearsExperience(vals.yearsExperience);
    setPreferredTone(vals.preferredTone);
    setIndustries(vals.industries);
    setSkills(vals.skills);
    setSaved(vals);
  }, []);

  // Load profile data — from activePersona when impersonating, from DB otherwise
  const loadProfile = useCallback(async () => {
    try {
      if (isImpersonating && activePersona) {
        populateFromPersona(activePersona);
      } else {
        const p = await getProfile();
        if (p) populateFromPersona(p);
      }
    } catch (err: any) {
      toast({ title: "Error loading profile", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isImpersonating, activePersona, populateFromPersona, toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Sync dirty state to navigation guard context
  const { setHasUnsavedChanges, setDirtySections } = useNavigationGuard();
  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
    const sections: string[] = [];
    if (dirty.identity) sections.push("Identity");
    if (dirty.resume) sections.push("Resume / Background");
    if (dirty.skills) sections.push("Skills & Target Industries");
    if (dirty.tone) sections.push("Writing Preferences");
    setDirtySections(sections);
    return () => {
      setHasUnsavedChanges(false);
      setDirtySections([]);
    };
  }, [hasUnsavedChanges, dirty, setHasUnsavedChanges, setDirtySections]);

  const doSave = useCallback(async () => {
    setSaving(true);
    try {
      const updates = {
        first_name: firstName || null,
        middle_name: middleName || null,
        last_name: lastName || null,
        display_name: displayName || null,
        resume_text: resumeText || null,
        years_experience: yearsExperience || null,
        target_industries: industries,
        key_skills: skills,
        preferred_tone: preferredTone,
      };

      if (isImpersonating && activePersona) {
        // Save to test_users table
        await updateTestUser(activePersona.id, updates);
        // Update the in-memory persona so the rest of the app sees the changes
        updateActivePersona({
          first_name: updates.first_name,
          middle_name: updates.middle_name,
          last_name: updates.last_name,
          display_name: updates.display_name,
          resume_text: updates.resume_text,
          years_experience: updates.years_experience,
          target_industries: industries,
          key_skills: skills,
          preferred_tone: preferredTone,
        });
      } else {
        await updateProfile(updates);
        await refreshRoot();
      }

      setSaved({
        firstName, middleName, lastName, displayName, resumeText, yearsExperience, preferredTone,
        industries: [...industries], skills: [...skills],
      });
      toast({ title: "Profile saved", description: "Your preferences will personalize future AI outputs." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [firstName, middleName, lastName, displayName, resumeText, yearsExperience, preferredTone, industries, skills, toast, refreshRoot, isImpersonating, activePersona, updateActivePersona]);

  const handleCardSave = async (cardName: string) => {
    setSavingCard(cardName);
    await doSave();
    setSavingCard(null);
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

  const cardBorderClass = (isDirty: boolean) =>
    isDirty ? "ring-2 ring-primary/50 border-primary/50" : "";

  const SaveCardButton = ({ cardName, isDirty }: { cardName: string; isDirty: boolean }) => (
    <CardFooter className="pt-3 pb-4 flex justify-end">
      <Button
        size="sm"
        onClick={() => handleCardSave(cardName)}
        disabled={!isDirty || saving || savingCard !== null}
        variant={isDirty ? "default" : "outline"}
      >
        {savingCard === cardName ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="mr-2 h-3.5 w-3.5" />
        )}
        {isDirty ? "Save Changes" : "Saved"}
      </Button>
    </CardFooter>
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading">
              {isImpersonating ? `${activePersona?.first_name} ${activePersona?.last_name}'s Profile` : "My Profile"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isImpersonating
                ? "Editing test user profile — changes will personalize AI outputs when impersonating this user."
                : "Your background and preferences personalize cover letters and executive reports."}
            </p>
          </div>
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="bg-primary/10 text-primary animate-pulse">
              Unsaved changes
            </Badge>
          )}
        </div>

        {/* Identity */}
        <Card className={`transition-all ${cardBorderClass(dirty.identity)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Identity
              {dirty.identity && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Unsaved</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
          <SaveCardButton cardName="identity" isDirty={dirty.identity} />
        </Card>

        {/* Resume */}
        <Card className={`transition-all ${cardBorderClass(dirty.resume)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Resume / Background
              {dirty.resume && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Unsaved</Badge>}
            </CardTitle>
            <CardDescription>Upload a PDF or paste key highlights — this context personalizes your AI outputs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ResumeDropZone
              fileRef={fileRef}
              uploading={uploading}
              onFileSelected={handleFileUpload}
            />
            <div className="space-y-1.5">
              <Label htmlFor="resumeText">Resume highlights (recommended)</Label>
              <Textarea
                id="resumeText"
                data-tutorial="resume-input"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume content or key highlights here. This will be injected into AI prompts to personalize cover letters and reports."
                rows={8}
                className="text-sm"
              />
            </div>
          </CardContent>
          <SaveCardButton cardName="resume" isDirty={dirty.resume} />
        </Card>

        {/* Skills & Industries */}
        <Card className={`transition-all ${cardBorderClass(dirty.skills)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Skills & Target Industries
              {dirty.skills && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Unsaved</Badge>}
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
                <Button variant="outline" size="sm" onClick={() => addTag(skills, setSkills, newSkill, setNewSkill)}>
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
                <Button variant="outline" size="sm" onClick={() => addTag(industries, setIndustries, newIndustry, setNewIndustry)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
          <SaveCardButton cardName="skills" isDirty={dirty.skills} />
        </Card>

        {/* Tone */}
        <Card className={`transition-all ${cardBorderClass(dirty.tone)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Writing Preferences
              {dirty.tone && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Unsaved</Badge>}
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
          <SaveCardButton cardName="tone" isDirty={dirty.tone} />
        </Card>

        {/* AI Style Memory — only for real profiles */}
        {!isImpersonating && <StylePreferencesCard />}

        {/* Test User Impersonation (Admin Only) */}
        {isAdmin && !isImpersonating && <TestUserManager />}

        {/* Admin Panel Link */}
        {isAdmin && (
          <Card className={`border-primary/30 ${isImpersonating ? "opacity-50 pointer-events-none" : ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Admin Settings
              </CardTitle>
              <CardDescription>Manage resume prompt styles and admin users.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} disabled={isImpersonating}>
                <Shield className="mr-2 h-4 w-4" /> Open Admin Panel
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Global save — only shows when there are changes */}
        {hasUnsavedChanges && (
          <div className="flex justify-end">
            <Button onClick={doSave} disabled={saving} size="lg">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save All Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
