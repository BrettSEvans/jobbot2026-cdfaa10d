import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit3, Trash2, Shield, Users, RefreshCw, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type TopUser = { user_id: string; count: number };
type RateLimitOverride = { id: string; user_id: string; is_unlimited: boolean; per_hour: number; per_day: number; notes: string | null };

export default function AdminRateLimitsTab() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [overrides, setOverrides] = useState<RateLimitOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [newUserId, setNewUserId] = useState("");
  const [newUnlimited, setNewUnlimited] = useState(false);
  const [newPerHour, setNewPerHour] = useState(20);
  const [newPerDay, setNewPerDay] = useState(100);
  const [newNotes, setNewNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - 86400_000).toISOString();
      const [usageRes, overridesRes] = await Promise.all([
        supabase.from('generation_usage').select('user_id, created_at').gte('created_at', since),
        (supabase as any).from('rate_limit_overrides').select('*').order('created_at', { ascending: true }),
      ]);
      if (usageRes.error) throw usageRes.error;
      const rows = usageRes.data || [];
      setTotalToday(rows.length);
      const counts: Record<string, number> = {};
      for (const r of rows) counts[r.user_id] = (counts[r.user_id] || 0) + 1;
      setTopUsers(
        Object.entries(counts).map(([user_id, count]) => ({ user_id, count })).sort((a, b) => b.count - a.count).slice(0, 5)
      );
      setOverrides(overridesRes.data || []);
    } catch (err: any) {
      toast({ title: 'Error loading data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveOverride = async () => {
    if (!editingId && !newUserId.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await (supabase as any).from('rate_limit_overrides').update({
          is_unlimited: newUnlimited,
          per_hour: newPerHour,
          per_day: newPerDay,
          notes: newNotes || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Updated', description: 'Rate limit override updated.' });
      } else {
        const { error } = await (supabase as any).from('rate_limit_overrides').insert({
          user_id: newUserId.trim(),
          is_unlimited: newUnlimited,
          per_hour: newPerHour,
          per_day: newPerDay,
          notes: newNotes || null,
        });
        if (error) throw error;
        toast({ title: 'Added', description: 'Rate limit override created.' });
      }
      resetForm();
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('rate_limit_overrides').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Removed', description: 'Override removed. User returns to default limits.' });
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const startEdit = (o: RateLimitOverride) => {
    setEditingId(o.id);
    setNewUserId(o.user_id);
    setNewUnlimited(o.is_unlimited);
    setNewPerHour(o.per_hour);
    setNewPerDay(o.per_day);
    setNewNotes(o.notes || "");
  };

  const resetForm = () => {
    setEditingId(null);
    setNewUserId("");
    setNewUnlimited(false);
    setNewPerHour(20);
    setNewPerDay(100);
    setNewNotes("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" /> Default Rate Limits
          </CardTitle>
          <CardDescription>Applied to all users without a custom override.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">20</p>
              <p className="text-xs text-muted-foreground">per hour</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">100</p>
              <p className="text-xs text-muted-foreground">per day</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Enforced server-side. Exceeding returns HTTP 429.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> User Overrides
          </CardTitle>
          <CardDescription>Grant specific users higher limits or unlimited access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">No custom overrides yet.</p>
          ) : (
            <div className="space-y-1.5">
              {overrides.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs break-all">{o.user_id}</span>
                      {o.is_unlimited ? (
                        <Badge className="text-xs bg-primary/15 text-primary border-primary/30">Unlimited</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">{o.per_hour}/hr · {o.per_day}/day</Badge>
                      )}
                    </div>
                    {o.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{o.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" aria-label="Edit override" onClick={() => startEdit(o)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label="Delete override" onClick={() => handleDeleteOverride(o.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="w-full space-y-3 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">{editingId ? 'Edit Override' : 'Add Override'}</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="User ID"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                disabled={!!editingId}
                className="col-span-2 font-mono text-xs"
              />
              <div className="col-span-2 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Unlimited</Label>
                  <Switch checked={newUnlimited} onCheckedChange={setNewUnlimited} />
                </div>
                {!newUnlimited && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs whitespace-nowrap">Per hour</Label>
                      <Input type="number" value={newPerHour} onChange={(e) => setNewPerHour(parseInt(e.target.value) || 20)} className="w-16 h-8 text-xs" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs whitespace-nowrap">Per day</Label>
                      <Input type="number" value={newPerDay} onChange={(e) => setNewPerDay(parseInt(e.target.value) || 100)} className="w-16 h-8 text-xs" />
                    </div>
                  </>
                )}
              </div>
              <Input
                placeholder="Notes (optional)"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="col-span-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveOverride} disabled={saving || (!editingId && !newUserId.trim())}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editingId ? 'Update' : 'Add Override'}
              </Button>
              {editingId && (
                <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Top Users (Last 24h)
              </CardTitle>
              <CardDescription>Total generations today: <strong>{totalToday}</strong></CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No generations in the last 24 hours.</p>
          ) : (
            <div className="space-y-1.5">
              {topUsers.map((u, i) => (
                <div key={u.user_id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border text-sm">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right">#{i + 1}</span>
                  <span className="font-mono text-xs text-foreground flex-1 break-all">{u.user_id}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (u.count / 100) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{u.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
