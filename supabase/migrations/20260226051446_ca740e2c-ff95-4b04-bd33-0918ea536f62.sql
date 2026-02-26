
-- Dashboard templates table
CREATE TABLE public.dashboard_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  job_function TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  dashboard_html TEXT NOT NULL,
  source_application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS: allow all access (no auth)
ALTER TABLE public.dashboard_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to dashboard_templates" ON public.dashboard_templates FOR ALL USING (true) WITH CHECK (true);

-- Add generation_status to job_applications for background generation tracking
ALTER TABLE public.job_applications 
  ADD COLUMN generation_status TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN generation_error TEXT;
