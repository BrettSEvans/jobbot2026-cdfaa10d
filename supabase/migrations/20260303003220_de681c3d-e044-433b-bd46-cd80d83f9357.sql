
-- 1. Create 4 new revision tables mirroring dashboard_revisions

CREATE TABLE public.executive_report_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  html text NOT NULL,
  label text DEFAULT ''::text,
  revision_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.raid_log_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  html text NOT NULL,
  label text DEFAULT ''::text,
  revision_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.architecture_diagram_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  html text NOT NULL,
  label text DEFAULT ''::text,
  revision_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.roadmap_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  html text NOT NULL,
  label text DEFAULT ''::text,
  revision_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Enable RLS on all 4 tables with same permissive policy

ALTER TABLE public.executive_report_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raid_log_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_diagram_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to executive_report_revisions"
  ON public.executive_report_revisions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to raid_log_revisions"
  ON public.raid_log_revisions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to architecture_diagram_revisions"
  ON public.architecture_diagram_revisions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to roadmap_revisions"
  ON public.roadmap_revisions FOR ALL
  USING (true) WITH CHECK (true);

-- 3. Add asset_type column to dashboard_templates

ALTER TABLE public.dashboard_templates
  ADD COLUMN asset_type text NOT NULL DEFAULT 'dashboard';
