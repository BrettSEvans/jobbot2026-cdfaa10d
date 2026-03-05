import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, RefreshCw, UserCheck, Trash2 } from "lucide-react";
import { fetchUsersByApprovalStatus, approveUser, rejectUser, softDeleteUser, type PendingUser } from "@/lib/api/approvals";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

export default function ApprovalQueue() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [approved, setApproved] = useState<PendingUser[]>([]);
  const [rejected, setRejected] = useState<PendingUser[]>([]);
  const [deleted, setDeleted] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PendingUser | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [p, a, r, d] = await Promise.all([
        fetchUsersByApprovalStatus("pending"),
        fetchUsersByApprovalStatus("approved"),
        fetchUsersByApprovalStatus("rejected"),
        fetchUsersByApprovalStatus("deleted"),
      ]);
      setPending(p);
      setApproved(a);
      setRejected(r);
      setDeleted(d);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      await approveUser(id);
      toast({ title: "Approved", description: "User has been granted access." });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      await rejectUser(id);
      toast({ title: "Rejected", description: "User registration rejected." });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionId(deleteTarget.id);
    try {
      await softDeleteUser(deleteTarget.id);
      toast({ title: "User deleted", description: "Account and all assets have been soft-deleted." });
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const renderUserRow = (user: PendingUser, showActions: boolean, showDelete: boolean = true) => (
    <div key={user.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {user.email || user.display_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unknown"}
        </p>
        <p className="text-xs text-muted-foreground">
          Registered {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
        </p>
        <p className="text-[10px] font-mono text-muted-foreground/60 break-all">{user.id}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {showActions && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
              onClick={() => handleApprove(user.id)}
              disabled={actionId === user.id}
            >
              {actionId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => handleReject(user.id)}
              disabled={actionId === user.id}
            >
              <XCircle className="h-3 w-3 mr-1" /> Reject
            </Button>
          </>
        )}
        {!showActions && user.approval_status !== "deleted" && (
          <Badge variant="outline" className="text-[10px]">
            {user.approval_status}
          </Badge>
        )}
        {showDelete && user.approval_status !== "deleted" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(user)}
            disabled={actionId === user.id}
            title="Delete user"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" /> Registration Approvals
              </CardTitle>
              <CardDescription>
                {pending.length > 0
                  ? `${pending.length} user${pending.length === 1 ? "" : "s"} awaiting approval`
                  : "No pending registrations"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <Tabs defaultValue="pending">
              <TabsList className="w-full grid grid-cols-4 mb-3">
                <TabsTrigger value="pending">
                  Pending {pending.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{pending.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
                <TabsTrigger value="deleted">Deleted ({deleted.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-2">
                {pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No pending registrations.</p>
                ) : pending.map((u) => renderUserRow(u, true))}
              </TabsContent>

              <TabsContent value="approved" className="space-y-2">
                {approved.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No approved users yet.</p>
                ) : approved.map((u) => renderUserRow(u, false))}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-2">
                {rejected.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No rejected users.</p>
                ) : rejected.map((u) => renderUserRow(u, false))}
              </TabsContent>

              <TabsContent value="deleted" className="space-y-2">
                {deleted.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No deleted users.</p>
                ) : deleted.map((u) => renderUserRow(u, false, false))}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete <strong>{deleteTarget?.email || deleteTarget?.display_name || "this user"}</strong> and all their job applications and assets. The user will no longer be able to access their account.
              <br /><br />
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded break-all">{deleteTarget?.id}</code>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={actionId === deleteTarget?.id}
            >
              {actionId === deleteTarget?.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
