import { supabase } from '@/integrations/supabase/client';
import { streamFromEdgeFunction, processSSEStream } from './streamUtils';

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
  branding?: any;
  companyName?: string;
  jobTitle?: string;
  competitors?: string[];
  customers?: string[];
  products?: string[];
  department?: string;
  templateHtml?: string;
  researchedSections?: any[];
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
  currentDashboardData?: any;
  userMessage: string;
  chatHistory?: Array<{ role: string; content: string }>;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  await streamFromEdgeFunction({
    functionName: 'refine-dashboard',
    body: { currentHtml, currentDashboardData, userMessage, chatHistory },
    onDelta,
    onDone,
  });
}

// --- CRUD for job applications ---
export async function saveJobApplication(app: {
  id?: string;
  job_url: string;
  company_url?: string;
  company_name?: string;
  job_title?: string;
  job_description_markdown?: string;
  cover_letter?: string;
  branding?: any;
  dashboard_html?: string;
  dashboard_data?: any;
  chat_history?: any[];
  competitors?: string[];
  customers?: string[];
  products?: string[];
  status?: string;
  generation_status?: string;
  generation_error?: string;
  research_reasoning?: string;
  executive_report_html?: string;
  raid_log_html?: string;
  architecture_diagram_html?: string;
  roadmap_html?: string;
}) {
  if (app.id) {
    const { data, error } = await supabase
      .from('job_applications')
      .update({ ...app, updated_at: new Date().toISOString() })
      .eq('id', app.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from('job_applications')
      .insert(app)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}

export async function getJobApplications() {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .order('created_at', { ascending: false });
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
  const { error } = await supabase
    .from('job_applications')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
