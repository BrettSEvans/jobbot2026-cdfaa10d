
-- 1. Create account_links table
CREATE TABLE public.account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id uuid NOT NULL,
  linked_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (primary_user_id, linked_user_id)
);

ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage account links"
  ON public.account_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own links"
  ON public.account_links FOR SELECT
  TO authenticated
  USING (primary_user_id = auth.uid() OR linked_user_id = auth.uid());

-- 2. Create is_linked_or_self function
CREATE OR REPLACE FUNCTION public.is_linked_or_self(_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.account_links
      WHERE (primary_user_id = _owner_id AND linked_user_id = auth.uid())
         OR (primary_user_id = auth.uid() AND linked_user_id = _owner_id)
    )
$$;

-- 3. Update owns_application to use is_linked_or_self
CREATE OR REPLACE FUNCTION public.owns_application(_application_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_applications
    WHERE id = _application_id
      AND public.is_linked_or_self(user_id)
  )
$$;

-- 4. Update job_applications RLS policies
DROP POLICY IF EXISTS "Users can CRUD active applications" ON public.job_applications;
CREATE POLICY "Users can CRUD active applications"
  ON public.job_applications FOR ALL
  TO authenticated
  USING (is_linked_or_self(user_id) AND deleted_at IS NULL)
  WITH CHECK (is_linked_or_self(user_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can permanently delete own trashed applications" ON public.job_applications;
CREATE POLICY "Users can permanently delete own trashed applications"
  ON public.job_applications FOR DELETE
  TO authenticated
  USING (is_linked_or_self(user_id) AND deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own deleted applications" ON public.job_applications;
CREATE POLICY "Users can update own deleted applications"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (is_linked_or_self(user_id))
  WITH CHECK (is_linked_or_self(user_id));

DROP POLICY IF EXISTS "Users can view own deleted applications" ON public.job_applications;
CREATE POLICY "Users can view own deleted applications"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (is_linked_or_self(user_id) AND deleted_at IS NOT NULL);

-- 5. Update user_resumes RLS
DROP POLICY IF EXISTS "Users can CRUD own resumes" ON public.user_resumes;
CREATE POLICY "Users can CRUD own resumes"
  ON public.user_resumes FOR ALL
  TO authenticated
  USING (is_linked_or_self(user_id))
  WITH CHECK (is_linked_or_self(user_id));

-- 6. Update pipeline_stage_history RLS
DROP POLICY IF EXISTS "Users can CRUD own stage history" ON public.pipeline_stage_history;
CREATE POLICY "Users can CRUD own stage history"
  ON public.pipeline_stage_history FOR ALL
  TO authenticated
  USING (is_linked_or_self(user_id))
  WITH CHECK (is_linked_or_self(user_id));

-- 7. Update user_style_preferences RLS
DROP POLICY IF EXISTS "Users can CRUD own style preferences" ON public.user_style_preferences;
CREATE POLICY "Users can CRUD own style preferences"
  ON public.user_style_preferences FOR ALL
  TO authenticated
  USING (is_linked_or_self(user_id))
  WITH CHECK (is_linked_or_self(user_id));

-- 8. Update generation_usage RLS
DROP POLICY IF EXISTS "Users can insert own usage" ON public.generation_usage;
CREATE POLICY "Users can insert own usage"
  ON public.generation_usage FOR INSERT
  TO authenticated
  WITH CHECK (is_linked_or_self(user_id));

DROP POLICY IF EXISTS "Users can view own usage" ON public.generation_usage;
CREATE POLICY "Users can view own usage"
  ON public.generation_usage FOR SELECT
  TO authenticated
  USING (is_linked_or_self(user_id));
