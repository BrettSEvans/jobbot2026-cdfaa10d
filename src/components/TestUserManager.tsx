import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, ArrowRightLeft, Trash2, UserCheck } from "lucide-react";
import { fetchTestUsers, createTestUser, deleteTestUser, testUserToPersona, type TestUserRow } from "@/lib/api/testUsers";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export default function TestUserManager() {
  const { toast } = useToast();
  const { activePersona, switchToTestUser, switchToSelf, isImpersonating } = useImpersonation();

  const [testUsers, setTestUsers] = useState<TestUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

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
      await createTestUser({ first_name: firstName.trim(), last_name: lastName.trim() });
      setFirstName("");
      setLastName("");
      await load();
      toast({ title: "Test user created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    // If currently impersonating this user, switch back first
    if (activePersona?.id === id) switchToSelf();
    try {
      await deleteTestUser(id);
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
              return (
                <div
                  key={tu.id}
                  className={`flex items-center justify-between p-2.5 rounded-md border transition-colors ${
                    isActive ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{tu.first_name} {tu.last_name}</span>
                    {isActive && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Active</Badge>}
                  </div>
                  <div className="flex gap-1.5">
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => switchToTestUser(testUserToPersona(tu))}
                      >
                        <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Switch
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(tu.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
