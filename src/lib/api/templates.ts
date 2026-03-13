import { supabase } from "@/integrations/supabase/client";

export interface DashboardTemplate {
  id: string;
  label: string;
  job_function: string;
  department: string;
  dashboard_html: string;
  source_application_id: string | null;
  created_at: string;
}

export async function getTemplates(filters?: {
  job_function?: string;
  department?: string;
}): Promise<DashboardTemplate[]> {
  let query = supabase
    .from("dashboard_templates" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.job_function) {
    query = query.ilike("job_function", `%${filters.job_function}%`);
  }
  if (filters?.department) {
    query = query.ilike("department", `%${filters.department}%`);
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
  source_application_id?: string;
}): Promise<DashboardTemplate> {
  const { data, error } = await supabase
    .from("dashboard_templates" as any)
    .insert(template)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as DashboardTemplate;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from("dashboard_templates" as any)
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
