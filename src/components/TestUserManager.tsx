import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, ArrowRightLeft, Trash2, UserCheck, ChevronDown, ChevronUp, X, Save } from "lucide-react";
import { fetchTestUsers, createTestUser, updateTestUser, deleteTestUser, testUserToPersona, type TestUserRow } from "@/lib/api/testUsers";
import { useImpersonation } from "@/contexts/ImpersonationContext";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "executive", label: "Executive" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "concise", label: "Concise & Direct" },
];

const EXPERIENCE_OPTIONS = [
  { value: "none", label: "Not set" },
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (3-5 years)" },
  { value: "senior", label: "Senior (6-10 years)" },
  { value: "staff", label: "Staff / Principal (10-15 years)" },
  { value: "executive", label: "Executive (15+ years)" },
];

export default function TestUserManager() {
  const { toast } = useToast();
  const { activePersona, switchToTestUser, switchToSelf, isImpersonating } = useImpersonation();

  const [testUsers, setTestUsers] = useState<TestUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    try {
      const rows = await fetchTestUsers();
      setTestUsers(rows);
    } catch (err: any) {
      toast({ title: "Error loading test users", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "First and last name required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const created = await createTestUser({ first_name: firstName.trim(), last_name: lastName.trim() });
      setFirstName("");
      setLastName("");
      await load();
      setExpandedId(created.id);
      toast({ title: "Test user created — expand to fill in their profile" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (activePersona?.id === id) switchToSelf();
    try {
      await deleteTestUser(id);
      if (expandedId === id) setExpandedId(null);
      await load();
      toast({ title: "Test user deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Test User Impersonation
        </CardTitle>
        <CardDescription>
          Create virtual personas and switch your active session to view the app as they would.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current status */}
        {isImpersonating && (
          <div className="flex items-center justify-between p-3 rounded-md bg-accent/50 border border-accent">
            <div className="flex items-center gap-2 text-sm">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>
                Impersonating: <strong>{activePersona?.first_name} {activePersona?.last_name}</strong>
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={switchToSelf}>
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Switch Back
            </Button>
          </div>
        )}

        {/* Create form */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Create Test User</Label>
          <div className="flex gap-2">
            <Input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : testUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">No test users yet.</p>
        ) : (
          <div className="space-y-2">
            {testUsers.map((tu) => {
              const isActive = activePersona?.id === tu.id;
              const isExpanded = expandedId === tu.id;
              return (
                <div key={tu.id} className={`rounded-md border transition-colors ${isActive ? "border-primary bg-primary/5" : "border-border"}`}>
                  {/* Row header */}
                  <div className="flex items-center justify-between p-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : tu.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <span className="text-sm font-medium">{tu.first_name} {tu.last_name}</span>
                      {isActive && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Active</Badge>}
                      {tu.resume_text && <Badge variant="outline" className="text-[10px] py-0">Has resume</Badge>}
                      {(tu.key_skills?.length > 0) && <Badge variant="outline" className="text-[10px] py-0">{tu.key_skills.length} skills</Badge>}
                    </div>
                    <div className="flex gap-1.5">
                      {!isActive && (
                        <Button size="sm" variant="outline" onClick={() => switchToTestUser(testUserToPersona(tu))}>
                          <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Switch
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(tu.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded edit form */}
                  {isExpanded && (
                    <TestUserEditForm testUser={tu} onSaved={load} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Inline edit form for a single test user */
function TestUserEditForm({ testUser, onSaved }: { testUser: TestUserRow; onSaved: () => Promise<void> }) {
  const { toast } = useToast();
  const { activePersona, updateActivePersona } = useImpersonation();
  const [saving, setSaving] = useState(false);

  const [editFirstName, setEditFirstName] = useState(testUser.first_name);
  const [editLastName, setEditLastName] = useState(testUser.last_name);
  const [editMiddleName, setEditMiddleName] = useState(testUser.middle_name || "");
  const [editDisplayName, setEditDisplayName] = useState(testUser.display_name || "");
  const [editResumeText, setEditResumeText] = useState(testUser.resume_text || "");
  const [editYearsExperience, setEditYearsExperience] = useState(testUser.years_experience || "none");
  const [editPreferredTone, setEditPreferredTone] = useState(testUser.preferred_tone || "professional");
  const [editSkills, setEditSkills] = useState<string[]>(testUser.key_skills || []);
  const [editIndustries, setEditIndustries] = useState<string[]>(testUser.target_industries || []);
  const [newSkill, setNewSkill] = useState("");
  const [newIndustry, setNewIndustry] = useState("");

  const addTag = (list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
    setInput("");
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      toast({ title: "First and last name required", variant: "destructive" });
      return;
    }
    // Commit any pending tag inputs
    const finalSkills = [...editSkills];
    if (newSkill.trim() && !finalSkills.includes(newSkill.trim())) finalSkills.push(newSkill.trim());
    const finalIndustries = [...editIndustries];
    if (newIndustry.trim() && !finalIndustries.includes(newIndustry.trim())) finalIndustries.push(newIndustry.trim());

    setSaving(true);
    try {
      const updates = {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        middle_name: editMiddleName.trim() || null,
        display_name: editDisplayName.trim() || null,
        resume_text: editResumeText.trim() || null,
        years_experience: editYearsExperience === "none" ? null : editYearsExperience,
        preferred_tone: editPreferredTone,
        key_skills: finalSkills,
        target_industries: finalIndustries,
      };
      await updateTestUser(testUser.id, updates);

      // If this is the active persona, update context too
      if (activePersona?.id === testUser.id) {
        updateActivePersona(updates);
      }

      setNewSkill("");
      setNewIndustry("");
      setEditSkills(finalSkills);
      setEditIndustries(finalIndustries);
      await onSaved();
      toast({ title: "Test user profile saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-3 pb-3 pt-1 space-y-3 border-t">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">First Name</Label>
          <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Last Name</Label>
          <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Middle Name</Label>
          <Input value={editMiddleName} onChange={(e) => setEditMiddleName(e.target.value)} className="h-8 text-sm" placeholder="Optional" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Display Name</Label>
          <Input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} className="h-8 text-sm" placeholder="Optional" />
        </div>
      </div>

      {/* Experience & Tone */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Experience Level</Label>
          <Select value={editYearsExperience} onValueChange={setEditYearsExperience}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Preferred Tone</Label>
          <Select value={editPreferredTone} onValueChange={setEditPreferredTone}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resume */}
      <div className="space-y-1">
        <Label className="text-xs">Resume / Background</Label>
        <Textarea
          value={editResumeText}
          onChange={(e) => setEditResumeText(e.target.value)}
          rows={4}
          className="text-sm"
          placeholder="Paste resume content or key highlights for this test persona..."
        />
      </div>

      {/* Skills */}
      <div className="space-y-1">
        <Label className="text-xs">Key Skills</Label>
        <div className="flex flex-wrap gap-1 min-h-[24px]">
          {editSkills.map((s, i) => (
            <Badge key={i} variant="secondary" className="text-xs gap-1 py-0">
              {s}
              <button onClick={() => removeTag(editSkills, setEditSkills, i)} className="ml-0.5 hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add skill"
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(editSkills, setEditSkills, newSkill, setNewSkill))}
          />
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => addTag(editSkills, setEditSkills, newSkill, setNewSkill)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Industries */}
      <div className="space-y-1">
        <Label className="text-xs">Target Industries</Label>
        <div className="flex flex-wrap gap-1 min-h-[24px]">
          {editIndustries.map((ind, i) => (
            <Badge key={i} variant="secondary" className="text-xs gap-1 py-0">
              {ind}
              <button onClick={() => removeTag(editIndustries, setEditIndustries, i)} className="ml-0.5 hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={newIndustry}
            onChange={(e) => setNewIndustry(e.target.value)}
            placeholder="Add industry"
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(editIndustries, setEditIndustries, newIndustry, setNewIndustry))}
          />
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => addTag(editIndustries, setEditIndustries, newIndustry, setNewIndustry)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
