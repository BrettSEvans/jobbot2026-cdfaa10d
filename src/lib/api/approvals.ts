import { supabase } from "@/integrations/supabase/client";

export interface PendingUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  approval_status: string;
  created_at: string;
}

export async function fetchUsersByApprovalStatus(status: string): Promise<PendingUser[]> {
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("id, email, first_name, last_name, display_name, approval_status, created_at")
    .eq("approval_status", status)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function approveUser(userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ approval_status: "approved" })
    .eq("id", userId);

  if (error) throw error;
}

export async function rejectUser(userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ approval_status: "rejected" })
    .eq("id", userId);

  if (error) throw error;
}
