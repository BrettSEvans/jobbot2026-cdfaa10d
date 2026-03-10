import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Megaphone, Link } from "lucide-react";
import { format } from "date-fns";

interface AttributedProfile {
  id: string;
  email: string | null;
  referral_source: Record<string, string> | null;
  created_at: string;
}

export default function AdminCampaignsTab() {
  const [profiles, setProfiles] = useState<AttributedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, email, referral_source, created_at")
      .not("referral_source", "is", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProfiles((data as unknown as AttributedProfile[]) ?? []);
        setLoading(false);
      });
  }, []);

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
