
-- Global best practices cache (one row per asset type)
CREATE TABLE public.asset_best_practices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_type text NOT NULL UNIQUE,
  best_practices text NOT NULL DEFAULT '',
  winning_patterns jsonb DEFAULT '{}'::jsonb,
  sample_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_best_practices ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (edge functions use service role for writes)
CREATE POLICY "Authenticated can read asset_best_practices"
  ON public.asset_best_practices FOR SELECT
  TO authenticated USING (true);

-- Download approval signals
CREATE TABLE public.asset_download_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  job_title text DEFAULT '',
  industry text DEFAULT '',
  asset_html_hash text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_download_signals ENABLE ROW LEVEL SECURITY;

-- Users can insert signals for their own applications
CREATE POLICY "Users can insert own download signals"
  ON public.asset_download_signals FOR INSERT
  TO authenticated
  WITH CHECK (application_id IN (
    SELECT id FROM public.job_applications WHERE user_id = auth.uid()
  ));
