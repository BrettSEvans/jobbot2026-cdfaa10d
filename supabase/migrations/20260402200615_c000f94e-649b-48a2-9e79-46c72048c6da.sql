
CREATE TABLE public.live_dashboards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid REFERENCES public.job_applications(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  slug_username text NOT NULL,
  slug_company text NOT NULL,
  slug_jobtitle text NOT NULL,
  dashboard_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  chatbot_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (slug_username, slug_company, slug_jobtitle)
);

ALTER TABLE public.live_dashboards ENABLE ROW LEVEL SECURITY;

-- Public read for published dashboards (anon + authenticated)
CREATE POLICY "Anyone can view published dashboards"
  ON public.live_dashboards
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Admin CRUD
CREATE POLICY "Admins can manage live dashboards"
  ON public.live_dashboards
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
