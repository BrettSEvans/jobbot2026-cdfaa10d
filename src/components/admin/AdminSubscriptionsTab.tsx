import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SubscriptionRow = {
  id: string;
  user_id: string;
  tier: "free" | "pro" | "premium";
  status: string;
  current_period_end: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
};

type EnrichedSub = SubscriptionRow & { email: string; name: string };

const TIER_COLORS: Record<string, string> = {
  free: "outline",
  pro: "secondary",
  premium: "default",
};

export default function AdminSubscriptionsTab() {
  const [subs, setSubs] = useState<EnrichedSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [subsRes, profilesRes] = await Promise.all([
        supabase.from("user_subscriptions").select("id, user_id, tier, status, current_period_end"),
        supabase.from("profiles").select("id, email, first_name, last_name, display_name"),
      ]);
      if (subsRes.error) throw subsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profileMap = new Map<string, ProfileRow>();
      for (const p of (profilesRes.data || [])) profileMap.set(p.id, p);

      const enriched: EnrichedSub[] = (subsRes.data || []).map((s) => {
        const p = profileMap.get(s.user_id);
        const name = p
          ? [p.first_name, p.last_name].filter(Boolean).join(" ") || p.display_name || ""
          : "";
        return { ...s, email: p?.email || "", name } as EnrichedSub;
      });

      enriched.sort((a, b) => {
        const order = { premium: 0, pro: 1, free: 2 };
        return (order[a.tier] ?? 3) - (order[b.tier] ?? 3) || a.email.localeCompare(b.email);
      });

      setSubs(enriched);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChangeTier = async (subId: string, newTier: string) => {
    setUpdatingId(subId);
    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({
          tier: newTier as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subId);
      if (error) throw error;
      toast({ title: "Updated", description: `Subscription changed to ${newTier}.` });
      setSubs((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, tier: newTier as any } : s))
      );
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const tierCounts = subs.reduce(
    (acc, s) => { acc[s.tier] = (acc[s.tier] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Subscription Overview
              </CardTitle>
              <CardDescription>{subs.length} total users</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(["free", "pro", "premium"] as const).map((t) => (
              <div key={t} className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{tierCounts[t] || 0}</p>
                <p className="text-xs text-muted-foreground capitalize">{t}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
          <CardDescription>Change a user's tier with the dropdown.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : subs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No subscriptions found.</p>
          ) : (
            <div className="space-y-1.5">
              {subs.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {s.name || s.email || "—"}
                      </span>
                      {s.name && s.email && (
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                          {s.email}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground break-all">
                      {s.user_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {updatingId === s.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    <Select
                      value={s.tier}
                      onValueChange={(val) => handleChangeTier(s.id, val)}
                      disabled={updatingId === s.id}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
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
