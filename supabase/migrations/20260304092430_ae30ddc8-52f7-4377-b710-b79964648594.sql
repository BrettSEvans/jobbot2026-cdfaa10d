
-- Per-user rate limit overrides
CREATE TABLE public.rate_limit_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_unlimited boolean NOT NULL DEFAULT false,
  per_hour integer NOT NULL DEFAULT 20,
  per_day integer NOT NULL DEFAULT 100,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_overrides_user ON public.rate_limit_overrides (user_id);

ALTER TABLE public.rate_limit_overrides ENABLE ROW LEVEL SECURITY;

-- Only admins can manage overrides
CREATE POLICY "Admins can manage rate limit overrides"
  ON public.rate_limit_overrides
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the founder admin as unlimited
INSERT INTO public.rate_limit_overrides (user_id, is_unlimited, notes)
VALUES ('f8182de6-de8e-4c12-9009-88fb5c4e66b8', true, 'Founder admin — unlimited');
