CREATE TABLE public.dashboard_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  dashboard_html TEXT NOT NULL,
  label TEXT DEFAULT '',
  revision_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to dashboard_revisions" ON public.dashboard_revisions FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_dashboard_revisions_app_id ON public.dashboard_revisions(application_id, revision_number DESC);