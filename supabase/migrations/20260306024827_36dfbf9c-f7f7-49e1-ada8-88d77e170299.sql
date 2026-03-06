
-- Fix 1: dashboard_templates - restrict INSERT/DELETE to authenticated
DROP POLICY IF EXISTS "Auth users can delete templates" ON public.dashboard_templates;
CREATE POLICY "Auth users can delete templates" ON public.dashboard_templates
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth users can insert templates" ON public.dashboard_templates;
CREATE POLICY "Auth users can insert templates" ON public.dashboard_templates
  FOR INSERT TO authenticated WITH CHECK (true);

-- Fix 2: resume_prompt_styles - restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can read active styles" ON public.resume_prompt_styles;
CREATE POLICY "Authenticated can read active styles" ON public.resume_prompt_styles
  FOR SELECT TO authenticated USING ((is_active = true) AND (deleted_at IS NULL));

-- Fix 3: proposed_assets - restrict to authenticated
DROP POLICY IF EXISTS "Users can CRUD own proposed_assets" ON public.proposed_assets;
CREATE POLICY "Users can CRUD own proposed_assets" ON public.proposed_assets
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- Fix 4: generated_assets - restrict to authenticated
DROP POLICY IF EXISTS "Users can CRUD own generated_assets" ON public.generated_assets;
CREATE POLICY "Users can CRUD own generated_assets" ON public.generated_assets
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- Fix 5: generated_asset_revisions - restrict to authenticated
DROP POLICY IF EXISTS "Users can CRUD own generated_asset_revisions" ON public.generated_asset_revisions;
CREATE POLICY "Users can CRUD own generated_asset_revisions" ON public.generated_asset_revisions
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- Fix 6: user_resumes - restrict to authenticated
DROP POLICY IF EXISTS "Users can CRUD own resumes" ON public.user_resumes;
CREATE POLICY "Users can CRUD own resumes" ON public.user_resumes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fix 7: pipeline_stage_history - restrict to authenticated
DROP POLICY IF EXISTS "Users can CRUD own stage history" ON public.pipeline_stage_history;
CREATE POLICY "Users can CRUD own stage history" ON public.pipeline_stage_history
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
