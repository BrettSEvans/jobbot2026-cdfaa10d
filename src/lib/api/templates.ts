import { supabase } from "@/integrations/supabase/client";
import { getActivePersonaSnapshot } from "@/contexts/ImpersonationContext";

export interface DashboardTemplate {
  id: string;
  label: string;
  job_function: string;
  department: string;
  dashboard_html: string;
  asset_type: string;
  source_application_id: string | null;
  created_at: string;
}

export async function getTemplates(filters?: {
  job_function?: string;
  department?: string;
  asset_type?: string;
  personaId?: string | null;
}): Promise<DashboardTemplate[]> {
  let query = supabase
    .from("dashboard_templates")
    .select("*")
    .order("created_at", { ascending: false });

  // Filter by persona
  const personaId = filters?.personaId;
  if (personaId) {
    query = query.eq("persona_id", personaId);
  } else if (personaId === null) {
    query = query.is("persona_id", null);
  }

  if (filters?.job_function) {
    query = query.ilike("job_function", `%${filters.job_function}%`);
  }
  if (filters?.department) {
    query = query.ilike("department", `%${filters.department}%`);
  }
  if (filters?.asset_type) {
    query = query.eq("asset_type", filters.asset_type);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as unknown as DashboardTemplate[];
}

export async function saveTemplate(template: {
  label: string;
  job_function: string;
  department: string;
  dashboard_html: string;
  asset_type?: string;
  source_application_id?: string;
}): Promise<DashboardTemplate> {
  const { data: { user } } = await supabase.auth.getUser();
  const activePersona = getActivePersonaSnapshot();
  const personaId = activePersona?.isTestUser ? activePersona.id : null;

  const { data, error } = await supabase
    .from("dashboard_templates")
    .insert({
      ...template,
      asset_type: template.asset_type || "dashboard",
      user_id: user?.id || null,
      persona_id: personaId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as DashboardTemplate;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from("dashboard_templates")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
