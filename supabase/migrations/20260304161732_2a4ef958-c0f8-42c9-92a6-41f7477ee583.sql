
-- Test users table: virtual personas owned by admins
CREATE TABLE public.test_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  middle_name TEXT,
  display_name TEXT,
  resume_text TEXT,
  years_experience TEXT,
  preferred_tone TEXT DEFAULT 'professional',
  key_skills TEXT[] DEFAULT '{}',
  target_industries TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only admins can manage their own test users
ALTER TABLE public.test_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can CRUD own test users"
  ON public.test_users
  FOR ALL
  TO authenticated
  USING (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
