import { supabase } from '@/integrations/supabase/client';
import { getActivePersonaSnapshot } from '@/contexts/ImpersonationContext';
import { streamFromEdgeFunction, processSSEStream } from './streamUtils';
import { getStyleContextForPrompt } from './stylePreferences';
import type { Json } from '@/integrations/supabase/types';

// --- Search for company icon (three-tier fallback) ---
export async function searchCompanyIcon(companyName?: string, companyUrl?: string): Promise<{ iconUrl: string | null; source: string | null }> {
  if (!companyName && !companyUrl) return { iconUrl: null, source: null };
  try {
    const { data, error } = await supabase.functions.invoke('search-company-icon', {
      body: { companyName, companyUrl },
    });
    if (error) {
      console.warn('search-company-icon error:', error.message);
      return { iconUrl: null, source: null };
    }
    return { iconUrl: data?.iconUrl || null, source: data?.source || null };
  } catch (e) {
    console.warn('search-company-icon failed:', e);
    return { iconUrl: null, source: null };
  }
}

// --- Scrape company branding ---
export async function scrapeCompanyBranding(url: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { data, error } = await supabase.functions.invoke('scrape-company-branding', {
      body: { url },
    });
    if (error) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
        continue;
      }
      throw new Error(error.message);
    }
    if (!data?.success) {
      if (attempt < retries && (data?.error?.includes('unexpected') || data?.error?.includes('UNKNOWN'))) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
        continue;
      }
      throw new Error(data?.error || 'Failed to scrape branding');
    }
    return { branding: data.branding, markdown: data.markdown, metadata: data.metadata, links: data.links };
  }
  throw new Error('Failed to scrape branding after retries');
}

// --- Analyze company (competitors, customers, products) ---
export async function analyzeCompany(params: {
  companyMarkdown?: string;
  jobDescription?: string;
  companyName?: string;
}) {
  const { data, error } = await supabase.functions.invoke('analyze-company', {
    body: params,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as {
    success: boolean;
    companyName: string;
    department: string;
    products: string[];
    competitors: string[];
    customers: string[];
    jobTitle: string;
  };
}

// --- Stream dashboard HTML generation ---
export async function streamDashboardGeneration({
  jobDescription,
  branding,
  companyName,
  jobTitle,
  competitors,
  customers,
  products,
  department,
  templateHtml,
  researchedSections,
  onDelta,
  onDone,
}: {
  jobDescription: string;
  branding?: Json;
  companyName?: string;
  jobTitle?: string;
  competitors?: string[];
  customers?: string[];
  products?: string[];
  department?: string;
  templateHtml?: string;
  researchedSections?: Array<Record<string, unknown>>;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  await streamFromEdgeFunction({
    functionName: 'generate-dashboard',
    body: { jobDescription, branding, companyName, jobTitle, competitors, customers, products, department, templateHtml, researchedSections },
    onDelta,
    onDone,
  });
}

// --- Stream dashboard refinement ---
export async function streamDashboardRefinement({
  currentHtml,
  currentDashboardData,
  userMessage,
  chatHistory,
  onDelta,
  onDone,
}: {
  currentHtml: string;
  currentDashboardData?: Json;
  userMessage: string;
  chatHistory?: Array<{ role: string; content: string }>;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  let styleContext = "";
  try { styleContext = await getStyleContextForPrompt(); } catch { /* non-critical */ }

  await streamFromEdgeFunction({
    functionName: 'refine-dashboard',
    body: { currentHtml, currentDashboardData, userMessage, chatHistory, styleContext },
    onDelta,
    onDone,
  });
}

// --- CRUD for job applications ---
const ALLOWED_JOB_APP_FIELDS = [
  "job_url", "company_url", "company_name", "job_title",
  "job_description_markdown", "cover_letter", "branding",
  "dashboard_html", "dashboard_data", "chat_history",
  "competitors", "customers", "products", "status",
  "generation_status", "generation_error", "research_reasoning",
  "executive_report_html", "raid_log_html", "architecture_diagram_html",
  "roadmap_html", "resume_html", "resume_style_id", "company_icon_url",
  "source_resume_id", "persona_id", "deleted_at", "deleted_by",
  "ats_score", "ats_scored_at", "pipeline_stage", "stage_changed_at",
  "selected_assets",
] as const;

function pickAllowed(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of ALLOWED_JOB_APP_FIELDS) {
    if (key in input) result[key] = input[key];
  }
  return result;
}

export type SaveJobApplicationInput = {
  id?: string;
  job_url: string;
  company_url?: string;
  company_name?: string;
  job_title?: string;
  job_description_markdown?: string;
  cover_letter?: string;
  branding?: Json;
  dashboard_html?: string;
  dashboard_data?: Json;
  chat_history?: Json;
  competitors?: Json;
  customers?: Json;
  products?: Json;
  status?: string;
  generation_status?: string;
  generation_error?: string | null;
  research_reasoning?: string;
  executive_report_html?: string;
  raid_log_html?: string;
  architecture_diagram_html?: string;
  roadmap_html?: string;
  resume_html?: string;
  resume_style_id?: string;
  company_icon_url?: string;
  source_resume_id?: string;
  persona_id?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  ats_score?: Json;
  ats_scored_at?: string;
  pipeline_stage?: string;
  stage_changed_at?: string;
  selected_assets?: Json;
};

export async function saveJobApplication(app: SaveJobApplicationInput) {
  const safeFields = pickAllowed(app as Record<string, unknown>);

  if (app.id) {
    const { data, error } = await supabase
      .from('job_applications')
      .update({ ...safeFields, updated_at: new Date().toISOString() })
      .eq('id', app.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  } else {
    // Get current user for user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Track which persona created this application
    const activePersona = getActivePersonaSnapshot();
    const personaId = activePersona?.isTestUser ? activePersona.id : null;

    const insertPayload = { ...safeFields, user_id: user.id, persona_id: personaId };
    const { data, error } = await (supabase
      .from('job_applications')
      .insert(insertPayload as any)
      .select()
      .single());
    if (error) throw new Error(error.message);
    return data;
  }
}

export async function getJobApplications(personaId?: string | null) {
  let query = supabase
    .from('job_applications')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Filter by persona: null = admin's own, uuid = specific test user
  if (personaId) {
    query = query.eq('persona_id', personaId);
  } else {
    query = query.is('persona_id', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getJobApplication(id: string) {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteJobApplication(id: string) {
  // Soft-delete: set deleted_at timestamp
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('job_applications')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id || null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getDeletedJobApplications(personaId?: string | null) {
  let query = supabase
    .from('job_applications')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (personaId) {
    query = query.eq('persona_id', personaId);
  } else {
    query = query.is('persona_id', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function restoreJobApplication(id: string) {
  const { error } = await supabase
    .from('job_applications')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function permanentlyDeleteJobApplication(id: string) {
  const { error } = await supabase
    .from('job_applications')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
