import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ScrollText, RefreshCw } from "lucide-react";
import { getAuditLog, type AuditLogEntry } from "@/lib/api/adminPrompts";
import { formatDistanceToNow } from "date-fns";

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  create_style: { label: 'Create', className: 'bg-primary/15 text-primary border-primary/30' },
  update_style: { label: 'Update', className: 'bg-accent-foreground/15 text-accent-foreground border-accent-foreground/30' },
  delete_style: { label: 'Delete', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  restore_style: { label: 'Restore', className: 'bg-primary/15 text-primary border-primary/30' },
  grant_admin: { label: 'Grant', className: 'bg-accent-foreground/15 text-accent-foreground border-accent-foreground/30' },
  revoke_admin: { label: 'Revoke', className: 'bg-accent-foreground/15 text-accent-foreground border-accent-foreground/30' },
  delete_user: { label: 'Delete User', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export default function AdminAuditTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      setEntries(await getAuditLog(50));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: 'Error loading audit log', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" /> Audit Log
            </CardTitle>
            <CardDescription>Immutable record of all admin actions.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No audit entries yet.</p>
        ) : (
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-1.5 pr-3">
              {entries.map((entry) => {
                const badge = ACTION_BADGE[entry.action] || { label: entry.action, className: 'bg-muted text-muted-foreground' };
                const meta = entry.metadata as Record<string, unknown>;
                const targetLabel = (meta?.label as string) || (meta?.slug as string) || (meta?.user_id as string) || entry.target_id;
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="flex-1 truncate text-foreground">{targetLabel}</span>
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{entry.admin_id}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
