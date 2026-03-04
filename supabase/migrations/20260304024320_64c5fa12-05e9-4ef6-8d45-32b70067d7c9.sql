-- 1. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Add user_id to job_applications
ALTER TABLE public.job_applications ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Drop old permissive-all policies and create proper ones

-- job_applications
DROP POLICY IF EXISTS "Allow all access to job_applications" ON public.job_applications;
CREATE POLICY "Users can CRUD own applications"
  ON public.job_applications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- dashboard_templates
DROP POLICY IF EXISTS "Allow all access to dashboard_templates" ON public.dashboard_templates;
CREATE POLICY "Anyone can read templates"
  ON public.dashboard_templates FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Auth users can insert templates"
  ON public.dashboard_templates FOR INSERT
  TO authenticated
  WITH CHECK (true);
CREATE POLICY "Auth users can delete templates"
  ON public.dashboard_templates FOR DELETE
  TO authenticated
  USING (true);

-- cover_letter_revisions
DROP POLICY IF EXISTS "Allow all access to cover_letter_revisions" ON public.cover_letter_revisions;
CREATE POLICY "Users can CRUD own cover_letter_revisions"
  ON public.cover_letter_revisions FOR ALL
  TO authenticated
  USING (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()));

-- dashboard_revisions
DROP POLICY IF EXISTS "Allow all access to dashboard_revisions" ON public.dashboard_revisions;
CREATE POLICY "Users can CRUD own dashboard_revisions"
  ON public.dashboard_revisions FOR ALL
  TO authenticated
  USING (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()));

-- executive_report_revisions
DROP POLICY IF EXISTS "Allow all access to executive_report_revisions" ON public.executive_report_revisions;
CREATE POLICY "Users can CRUD own executive_report_revisions"
  ON public.executive_report_revisions FOR ALL
  TO authenticated
  USING (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()));

-- raid_log_revisions
DROP POLICY IF EXISTS "Allow all access to raid_log_revisions" ON public.raid_log_revisions;
CREATE POLICY "Users can CRUD own raid_log_revisions"
  ON public.raid_log_revisions FOR ALL
  TO authenticated
  USING (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()));

-- architecture_diagram_revisions
DROP POLICY IF EXISTS "Allow all access to architecture_diagram_revisions" ON public.architecture_diagram_revisions;
CREATE POLICY "Users can CRUD own architecture_diagram_revisions"
  ON public.architecture_diagram_revisions FOR ALL
  TO authenticated
  USING (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()));

-- roadmap_revisions
DROP POLICY IF EXISTS "Allow all access to roadmap_revisions" ON public.roadmap_revisions;
CREATE POLICY "Users can CRUD own roadmap_revisions"
  ON public.roadmap_revisions FOR ALL
  TO authenticated
  USING (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM public.job_applications WHERE user_id = auth.uid()));