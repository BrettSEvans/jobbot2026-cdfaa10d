
-- Job applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  job_url TEXT NOT NULL,
  company_url TEXT,
  company_name TEXT,
  job_title TEXT,
  job_description_markdown TEXT,
  cover_letter TEXT,
  branding JSONB,
  dashboard_html TEXT,
  chat_history JSONB DEFAULT '[]'::jsonb,
  competitors JSONB DEFAULT '[]'::jsonb,
  customers JSONB DEFAULT '[]'::jsonb,
  products JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
);

-- Enable RLS but allow all access (no auth required per plan)
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to job_applications" ON public.job_applications
  FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for HTML assets
INSERT INTO storage.buckets (id, name, public) VALUES ('dashboard-assets', 'dashboard-assets', true);

CREATE POLICY "Allow all access to dashboard-assets" ON storage.objects
  FOR ALL USING (bucket_id = 'dashboard-assets') WITH CHECK (bucket_id = 'dashboard-assets');
