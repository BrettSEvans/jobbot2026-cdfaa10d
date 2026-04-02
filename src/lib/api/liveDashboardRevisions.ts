import { supabase } from '@/integrations/supabase/client';
import type { DashboardData } from '@/lib/dashboard/schema';

export interface LiveDashboardRevision {
  id: string;
  live_dashboard_id: string;
  application_id: string;
  revision_number: number;
  dashboard_data: DashboardData;
  label: string | null;
  source: string;
  created_at: string;
}

export async function saveLiveDashboardRevision(
  liveDashboardId: string,
  applicationId: string,
  dashboardData: DashboardData,
  source: string,
  label?: string,
): Promise<LiveDashboardRevision> {
  // Get next revision number
  const { data: latest } = await supabase
    .from('live_dashboard_revisions' as any)
    .select('revision_number')
    .eq('live_dashboard_id', liveDashboardId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  const nextRevision = ((latest as any)?.revision_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('live_dashboard_revisions' as any)
    .insert({
      live_dashboard_id: liveDashboardId,
      application_id: applicationId,
      dashboard_data: dashboardData as any,
      revision_number: nextRevision,
      label: label || `v${nextRevision}`,
      source,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as LiveDashboardRevision;
}

export async function getLiveDashboardRevisions(
  liveDashboardId: string,
): Promise<LiveDashboardRevision[]> {
  const { data, error } = await supabase
    .from('live_dashboard_revisions' as any)
    .select('*')
    .eq('live_dashboard_id', liveDashboardId)
    .order('revision_number', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LiveDashboardRevision[];
}

export async function deleteLiveDashboardRevision(id: string) {
  const { error } = await supabase
    .from('live_dashboard_revisions' as any)
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
