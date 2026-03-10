import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Megaphone, Link, Plus, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const BASE_URL = "https://jobbot2026.lovable.app";

interface AttributedProfile {
  id: string;
  email: string | null;
  referral_source: Record<string, string> | null;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
  ref_code: string | null;
  max_signups: number | null;
  created_at: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildTrackingUrl(c: Campaign): string {
  const params = new URLSearchParams();
  if (c.utm_source) params.set("utm_source", c.utm_source);
  if (c.utm_medium) params.set("utm_medium", c.utm_medium);
  if (c.utm_campaign) params.set("utm_campaign", c.utm_campaign);
  if (c.utm_content) params.set("utm_content", c.utm_content);
  if (c.utm_term) params.set("utm_term", c.utm_term);
  if (c.ref_code) params.set("ref", c.ref_code);
  return `${BASE_URL}/?${params.toString()}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default function AdminCampaignsTab() {
  const [profiles, setProfiles] = useState<AttributedProfile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create dialog state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "", ref_code: "", max_signups: "" });

  useEffect(() => {
    Promise.all([
      supabase
        .from("profiles")
        .select("id, email, referral_source, created_at")
        .not("referral_source", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false }),
    ]).then(([profilesRes, campaignsRes]) => {
      setProfiles((profilesRes.data as unknown as AttributedProfile[]) ?? []);
      setCampaigns((campaignsRes.data as unknown as Campaign[]) ?? []);
      setLoading(false);
    });
  }, []);

  // Auto-generate campaign slug from name
  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      utm_campaign: prev.utm_campaign === slugify(prev.name) || !prev.utm_campaign ? slugify(name) : prev.utm_campaign,
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.utm_campaign.trim()) {
      toast.error("Name and campaign slug are required");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        name: form.name.trim(),
        utm_source: form.utm_source.trim(),
        utm_medium: form.utm_medium.trim(),
        utm_campaign: form.utm_campaign.trim(),
        utm_content: form.utm_content.trim() || null,
        utm_term: form.utm_term.trim() || null,
        ref_code: form.ref_code.trim() || null,
        created_by: user.id,
      } as any)
      .select()
      .single();

    setSaving(false);
    if (error) {
      toast.error("Failed to create campaign");
      return;
    }
    setCampaigns((prev) => [data as unknown as Campaign, ...prev]);
    setForm({ name: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "", ref_code: "" });
    setOpen(false);
    toast.success("Campaign created");
  };

  // Count signups per campaign
  const signupCounts = useMemo(() => {
    const map: Record<string, number> = {};
    campaigns.forEach((c) => {
      map[c.utm_campaign] = profiles.filter(
        (p) => p.referral_source?.utm_campaign === c.utm_campaign
      ).length;
    });
    return map;
  }, [campaigns, profiles]);

  const filtered = useMemo(() => {
    if (!search) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(
      (p) =>
        p.email?.toLowerCase().includes(q) ||
        JSON.stringify(p.referral_source).toLowerCase().includes(q)
    );
  }, [profiles, search]);

  // Aggregate by campaign
  const campaignCounts = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      const key = p.referral_source?.utm_campaign || "(no campaign)";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [profiles]);

  // Aggregate by ref code
  const refCounts = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      const key = p.referral_source?.ref;
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [profiles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Attributed Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profiles.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {campaignCounts.slice(0, 5).map(([name, count]) => (
                <Badge key={name} variant="secondary" className="text-xs">
                  {name} ({count})
                </Badge>
              ))}
              {campaignCounts.length === 0 && <span className="text-sm text-muted-foreground">None yet</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Link className="h-4 w-4" /> Ref Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {refCounts.slice(0, 5).map(([code, count]) => (
                <Badge key={code} variant="outline" className="text-xs font-mono">
                  {code} ({count})
                </Badge>
              ))}
              {refCounts.length === 0 && <span className="text-sm text-muted-foreground">None yet</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Your Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Your Campaigns</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Campaign</DialogTitle>
                <DialogDescription>Define UTM parameters to generate a trackable link.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div>
                  <Label>Name *</Label>
                  <Input placeholder="Spring LinkedIn Push" value={form.name} onChange={(e) => handleNameChange(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Source</Label>
                    <Input placeholder="linkedin, twitter…" value={form.utm_source} onChange={(e) => setForm((p) => ({ ...p, utm_source: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Medium</Label>
                    <Input placeholder="social, cpc, email…" value={form.utm_medium} onChange={(e) => setForm((p) => ({ ...p, utm_medium: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Campaign Slug *</Label>
                  <Input placeholder="spring-linkedin-push" value={form.utm_campaign} onChange={(e) => setForm((p) => ({ ...p, utm_campaign: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Content</Label>
                    <Input placeholder="optional" value={form.utm_content} onChange={(e) => setForm((p) => ({ ...p, utm_content: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Term</Label>
                    <Input placeholder="optional" value={form.utm_term} onChange={(e) => setForm((p) => ({ ...p, utm_term: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Ref Code</Label>
                    <Input placeholder="optional" value={form.ref_code} onChange={(e) => setForm((p) => ({ ...p, ref_code: e.target.value }))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tracking Link</TableHead>
                <TableHead className="text-center">Signups</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No campaigns yet. Create one above.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => {
                  const url = buildTrackingUrl(c);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 max-w-xs">
                          <span className="text-xs text-muted-foreground truncate">{url}</span>
                          <CopyButton text={url} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{signupCounts[c.utm_campaign] ?? 0}</TableCell>
                      <TableCell>{format(new Date(c.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Attribution table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attribution Log</CardTitle>
          <Input
            placeholder="Search by email, campaign, ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm mt-2"
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Signed Up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No attributed users found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email || "—"}</TableCell>
                    <TableCell>{p.referral_source?.utm_source || "—"}</TableCell>
                    <TableCell>{p.referral_source?.utm_medium || "—"}</TableCell>
                    <TableCell>{p.referral_source?.utm_campaign || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.referral_source?.ref || "—"}</TableCell>
                    <TableCell>{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
