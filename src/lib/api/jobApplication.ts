import { supabase } from '@/integrations/supabase/client';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
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
  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-dashboard`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ jobDescription, branding, companyName, jobTitle, competitors, customers, products, department, templateHtml, researchedSections }),
    }
  );

  if (!resp.ok || !resp.body) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed (${resp.status})`);
  }

  await processSSEStream(resp.body, onDelta, onDone);
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
  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refine-dashboard`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ currentHtml, currentDashboardData, userMessage, chatHistory }),
    }
  );

  if (!resp.ok || !resp.body) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed (${resp.status})`);
  }

  await processSSEStream(resp.body, onDelta, onDone);
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
}) {
  // Ensure user_id is set for RLS compliance
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to save an application.");
  }

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
      .insert({ ...app, user_id: session.user.id })
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

// --- SSE Stream processor (shared) ---
async function processSSEStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
  onDone: () => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const json = line.slice(6).trim();
      if (json === '[DONE]') { streamDone = true; break; }

      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }

  // flush remaining
  if (buffer.trim()) {
    for (let raw of buffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (!raw.startsWith('data: ')) continue;
      const json = raw.slice(6).trim();
      if (json === '[DONE]') continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
