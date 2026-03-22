
CREATE TABLE public.asset_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  application_id uuid REFERENCES public.job_applications(id) ON DELETE CASCADE NOT NULL,
  asset_type text NOT NULL,
  asset_id uuid,
  rating text NOT NULL DEFAULT 'none',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage asset reviews"
  ON public.asset_reviews
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
