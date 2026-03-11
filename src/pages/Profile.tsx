import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";
import { getProfile, updateProfile, listUserResumes, type UserResume } from "@/lib/api/profile";
import { updateTestUser } from "@/lib/api/testUsers";
import StylePreferencesCard from "@/components/StylePreferencesCard";
import TestUserManager from "@/components/TestUserManager";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useImpersonation } from "@/contexts/ImpersonationContext";

import IdentityCard from "@/components/profile/IdentityCard";
import ResumeCard from "@/components/profile/ResumeCard";
import SkillsCard from "@/components/profile/SkillsCard";
import ToneCard from "@/components/profile/ToneCard";
import CoverLetterCard from "@/components/profile/CoverLetterCard";

export default function Profile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin } = useUserRoles();
  const { activePersona, isImpersonating, refreshRoot, updateActivePersona } = useImpersonation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCard, setSavingCard] = useState<string | null>(null);
  const [resumes, setResumes] = useState<UserResume[]>([]);
  const [resumesLoaded, setResumesLoaded] = useState(false);

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
  const [masterCoverLetter, setMasterCoverLetter] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  // Saved values (snapshot from last load/save)
  const [saved, setSaved] = useState({
    firstName: "", middleName: "", lastName: "", displayName: "",
    resumeText: "", yearsExperience: "", preferredTone: "professional",
    industries: [] as string[], skills: [] as string[], masterCoverLetter: "",
    phone: "", linkedinUrl: "",
  });

  // Compute dirty state per card
  const dirty = useMemo(() => ({
    identity: firstName !== saved.firstName || middleName !== saved.middleName || lastName !== saved.lastName || displayName !== saved.displayName || yearsExperience !== saved.yearsExperience || phone !== saved.phone || linkedinUrl !== saved.linkedinUrl,
    resume: resumeText !== saved.resumeText,
    skills: JSON.stringify(skills) !== JSON.stringify(saved.skills) || JSON.stringify(industries) !== JSON.stringify(saved.industries) || newSkill.trim() !== "" || newIndustry.trim() !== "",
    tone: preferredTone !== saved.preferredTone,
    coverLetter: masterCoverLetter !== saved.masterCoverLetter,
  }), [displayName, resumeText, yearsExperience, preferredTone, industries, skills, saved, newSkill, newIndustry, middleName, firstName, lastName, masterCoverLetter, phone, linkedinUrl]);

  const hasUnsavedChanges = dirty.identity || dirty.resume || dirty.skills || dirty.tone || dirty.coverLetter;

  // Populate form fields from a persona object
  const populateFromPersona = useCallback((p: {
    first_name?: string | null; middle_name?: string | null; last_name?: string | null;
    display_name?: string | null; resume_text?: string | null; years_experience?: string | null;
    preferred_tone?: string | null; target_industries?: string[] | null; key_skills?: string[] | null;
  }) => {
    const vals = {
      firstName: p.first_name || "", middleName: p.middle_name || "", lastName: p.last_name || "",
      displayName: p.display_name || "", resumeText: p.resume_text || "",
      yearsExperience: p.years_experience || "", preferredTone: p.preferred_tone || "professional",
      industries: p.target_industries || [], skills: p.key_skills || [],
      masterCoverLetter: 'master_cover_letter' in p ? (p as unknown as Record<string, unknown>).master_cover_letter as string || "" : "",
      phone: 'phone' in p ? (p as unknown as Record<string, unknown>).phone as string || "" : "",
      linkedinUrl: 'linkedin_url' in p ? (p as unknown as Record<string, unknown>).linkedin_url as string || "" : "",
    };
    setFirstName(vals.firstName); setMiddleName(vals.middleName); setLastName(vals.lastName);
    setDisplayName(vals.displayName); setResumeText(vals.resumeText);
    setYearsExperience(vals.yearsExperience); setPreferredTone(vals.preferredTone);
    setIndustries(vals.industries); setSkills(vals.skills);
    setMasterCoverLetter(vals.masterCoverLetter);
    setPhone(vals.phone); setLinkedinUrl(vals.linkedinUrl);
    setSaved(vals);
  }, []);

  // Load profile
  const loadProfile = useCallback(async () => {
    try {
      if (isImpersonating && activePersona) {
        populateFromPersona(activePersona);
      } else {
        const p = await getProfile();
        if (p) populateFromPersona(p);
      }
    } catch (err: unknown) {
      toast({ title: "Error loading profile", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isImpersonating, activePersona, populateFromPersona, toast]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Nav guard
  const { setHasUnsavedChanges, setDirtySections } = useNavigationGuard();
  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
    const sections: string[] = [];
    if (dirty.identity) sections.push("Identity");
    if (dirty.resume) sections.push("Resume / Background");
    if (dirty.skills) sections.push("Skills & Target Industries");
    if (dirty.tone) sections.push("Writing Preferences");
    if (dirty.coverLetter) sections.push("Master Cover Letter");
    setDirtySections(sections);
    return () => { setHasUnsavedChanges(false); setDirtySections([]); };
  }, [hasUnsavedChanges, dirty, setHasUnsavedChanges, setDirtySections]);

  const doSave = useCallback(async () => {
    setSaving(true);
    try {
      const updates = {
        first_name: firstName || null, middle_name: middleName || null,
        last_name: lastName || null, display_name: displayName || null,
        resume_text: resumeText || null, years_experience: yearsExperience || null,
        target_industries: industries, key_skills: skills, preferred_tone: preferredTone,
        master_cover_letter: masterCoverLetter || null,
        phone: phone || null, linkedin_url: linkedinUrl || null,
      };
      if (isImpersonating && activePersona) {
        await updateTestUser(activePersona.id, updates);
        updateActivePersona({
          first_name: updates.first_name, middle_name: updates.middle_name,
          last_name: updates.last_name, display_name: updates.display_name,
          resume_text: updates.resume_text, years_experience: updates.years_experience,
          target_industries: industries, key_skills: skills, preferred_tone: preferredTone,
        });
      } else {
        await updateProfile(updates);
        await refreshRoot();
      }
      setSaved({
        firstName, middleName, lastName, displayName, resumeText, yearsExperience, preferredTone,
        industries: [...industries], skills: [...skills], masterCoverLetter,
        phone, linkedinUrl,
      });
      toast({ title: "Profile saved", description: "Your preferences will personalize future AI outputs." });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [firstName, middleName, lastName, displayName, resumeText, yearsExperience, preferredTone, industries, skills, masterCoverLetter, phone, linkedinUrl, toast, refreshRoot, isImpersonating, activePersona, updateActivePersona]);

  const handleCardSave = async (cardName: string) => {
    setSavingCard(cardName);
    await doSave();
    setSavingCard(null);
  };

  // Load resumes list
  useEffect(() => {
    if (!isImpersonating) {
      listUserResumes().then((r) => { setResumes(r); setResumesLoaded(true); }).catch(() => setResumesLoaded(true));
    } else {
      setResumesLoaded(true);
    }
  }, [isImpersonating]);

  const cardBorderClass = (isDirty: boolean) =>
    isDirty ? "ring-2 ring-primary/50 border-primary/50" : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-heading truncate">
              {isImpersonating ? `${activePersona?.first_name} ${activePersona?.last_name}'s Profile` : "My Profile"}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {isImpersonating
                ? "Editing test user profile — changes will personalize AI outputs when impersonating this user."
                : "Your background and preferences personalize cover letters and executive reports."}
            </p>
          </div>
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="bg-primary/10 text-primary animate-pulse self-start sm:self-auto shrink-0">
              Unsaved changes
            </Badge>
          )}
        </div>

        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4 md:space-y-6">
            <IdentityCard
              firstName={firstName} setFirstName={setFirstName}
              middleName={middleName} setMiddleName={setMiddleName}
              lastName={lastName} setLastName={setLastName}
              displayName={displayName} setDisplayName={setDisplayName}
              yearsExperience={yearsExperience} setYearsExperience={setYearsExperience}
              phone={phone} setPhone={setPhone}
              linkedinUrl={linkedinUrl} setLinkedinUrl={setLinkedinUrl}
              isDirty={dirty.identity} saving={saving} savingCard={savingCard}
              onSave={handleCardSave} cardBorderClass={cardBorderClass(dirty.identity)}
            />

            <SkillsCard
              skills={skills} setSkills={setSkills} newSkill={newSkill} setNewSkill={setNewSkill}
              industries={industries} setIndustries={setIndustries} newIndustry={newIndustry} setNewIndustry={setNewIndustry}
              isDirty={dirty.skills} saving={saving} savingCard={savingCard}
              onSave={handleCardSave} cardBorderClass={cardBorderClass(dirty.skills)}
            />

            <ToneCard
              preferredTone={preferredTone} setPreferredTone={setPreferredTone}
              isDirty={dirty.tone} saving={saving} savingCard={savingCard}
              onSave={handleCardSave} cardBorderClass={cardBorderClass(dirty.tone)}
            />
          </div>

          <div className="space-y-4 md:space-y-6">
            <ResumeCard
              resumeText={resumeText} setResumeText={setResumeText}
              resumes={resumes} setResumes={setResumes} resumesLoaded={resumesLoaded}
              isImpersonating={isImpersonating}
              isDirty={dirty.resume} saving={saving} savingCard={savingCard}
              onSave={handleCardSave} cardBorderClass={cardBorderClass(dirty.resume)}
            />

            <CoverLetterCard
              masterCoverLetter={masterCoverLetter}
              setMasterCoverLetter={setMasterCoverLetter}
              isDirty={dirty.coverLetter} saving={saving} savingCard={savingCard}
              onSave={handleCardSave} cardBorderClass={cardBorderClass(dirty.coverLetter)}
            />
          </div>
        </div>

        {!isImpersonating && <StylePreferencesCard />}

        {isAdmin && !isImpersonating && <TestUserManager />}

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

        {hasUnsavedChanges && (
          <div className="flex justify-end sticky bottom-4 z-10">
            <Button onClick={doSave} disabled={saving} size="lg" className="w-full sm:w-auto shadow-lg">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save All Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
