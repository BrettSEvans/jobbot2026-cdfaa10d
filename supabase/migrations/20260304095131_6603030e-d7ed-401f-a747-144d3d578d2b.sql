
-- Proposed assets: stores the 6 AI-suggested asset types per application
CREATE TABLE public.proposed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  asset_name text NOT NULL,
  brief_description text NOT NULL DEFAULT '',
  selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own proposed_assets"
  ON public.proposed_assets FOR ALL
  USING (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()));

-- Generated dynamic assets: stores the 3 selected + generated assets
CREATE TABLE public.generated_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  asset_name text NOT NULL,
  brief_description text DEFAULT '',
  html text NOT NULL DEFAULT '',
  generation_status text NOT NULL DEFAULT 'pending',
  generation_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own generated_assets"
  ON public.generated_assets FOR ALL
  USING (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()));

-- Revisions for dynamic assets
CREATE TABLE public.generated_asset_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.generated_assets(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  html text NOT NULL,
  label text DEFAULT '',
  revision_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_asset_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own generated_asset_revisions"
  ON public.generated_asset_revisions FOR ALL
  USING (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()));
