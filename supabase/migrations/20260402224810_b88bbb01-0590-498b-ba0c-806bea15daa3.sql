
CREATE TABLE public.live_dashboard_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_dashboard_id uuid NOT NULL REFERENCES public.live_dashboards(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  revision_number integer NOT NULL DEFAULT 1,
  dashboard_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  label text DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ldr_live_dashboard_id ON public.live_dashboard_revisions(live_dashboard_id);
CREATE INDEX idx_ldr_application_id ON public.live_dashboard_revisions(application_id);

ALTER TABLE public.live_dashboard_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage live dashboard revisions"
  ON public.live_dashboard_revisions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view revisions of published dashboards"
  ON public.live_dashboard_revisions FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_dashboards ld
      WHERE ld.id = live_dashboard_id AND ld.is_published = true
    )
  );
