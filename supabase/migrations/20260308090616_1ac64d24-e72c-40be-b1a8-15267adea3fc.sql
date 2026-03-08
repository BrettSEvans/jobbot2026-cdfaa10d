
-- Phase 1: Convert ALL RESTRICTIVE RLS policies to PERMISSIVE
-- and remove user UPDATE on user_subscriptions

-- ============================================
-- TABLE: admin_audit_log
-- ============================================
DROP POLICY IF EXISTS "Admins can insert audit entries" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;

CREATE POLICY "Admins can insert audit entries" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABLE: architecture_diagram_revisions
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own architecture_diagram_revisions" ON public.architecture_diagram_revisions;

CREATE POLICY "Users can CRUD own architecture_diagram_revisions" ON public.architecture_diagram_revisions
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- ============================================
-- TABLE: cover_letter_revisions
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own cover_letter_revisions" ON public.cover_letter_revisions;

CREATE POLICY "Users can CRUD own cover_letter_revisions" ON public.cover_letter_revisions
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- ============================================
-- TABLE: dashboard_revisions
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own dashboard_revisions" ON public.dashboard_revisions;

CREATE POLICY "Users can CRUD own dashboard_revisions" ON public.dashboard_revisions
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- ============================================
-- TABLE: dashboard_templates
-- ============================================
DROP POLICY IF EXISTS "Anyone can read templates" ON public.dashboard_templates;
DROP POLICY IF EXISTS "Users can delete own templates or admins" ON public.dashboard_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.dashboard_templates;

CREATE POLICY "Anyone can read templates" ON public.dashboard_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can delete own templates or admins" ON public.dashboard_templates
  FOR DELETE TO authenticated
  USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own templates" ON public.dashboard_templates
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()) OR (user_id IS NULL));

-- ============================================
-- TABLE: executive_report_revisions
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own executive_report_revisions" ON public.executive_report_revisions;

CREATE POLICY "Users can CRUD own executive_report_revisions" ON public.executive_report_revisions
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- ============================================
-- TABLE: generated_asset_revisions
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own generated_asset_revisions" ON public.generated_asset_revisions;

CREATE POLICY "Users can CRUD own generated_asset_revisions" ON public.generated_asset_revisions
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- ============================================
-- TABLE: generated_assets
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own generated_assets" ON public.generated_assets;

CREATE POLICY "Users can CRUD own generated_assets" ON public.generated_assets
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- ============================================
-- TABLE: generation_usage
-- ============================================
DROP POLICY IF EXISTS "Admins can view all usage" ON public.generation_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.generation_usage;
DROP POLICY IF EXISTS "Users can view own usage" ON public.generation_usage;

CREATE POLICY "Admins can view all usage" ON public.generation_usage
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own usage" ON public.generation_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own usage" ON public.generation_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- TABLE: job_applications
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD active applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can permanently delete own trashed applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can update own deleted applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can view own deleted applications" ON public.job_applications;

CREATE POLICY "Users can CRUD active applications" ON public.job_applications
  FOR ALL TO authenticated
  USING ((user_id = auth.uid()) AND (deleted_at IS NULL))
  WITH CHECK ((user_id = auth.uid()) AND (deleted_at IS NULL));

CREATE POLICY "Users can permanently delete own trashed applications" ON public.job_applications
  FOR DELETE TO authenticated
  USING ((user_id = auth.uid()) AND (deleted_at IS NOT NULL));

CREATE POLICY "Users can update own deleted applications" ON public.job_applications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own deleted applications" ON public.job_applications
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) AND (deleted_at IS NOT NULL));

-- ============================================
-- TABLE: pipeline_stage_history
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own stage history" ON public.pipeline_stage_history;

CREATE POLICY "Users can CRUD own stage history" ON public.pipeline_stage_history
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- TABLE: profiles
-- ============================================
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update approval status" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update approval status" ON public.profiles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- TABLE: proposed_assets
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own proposed_assets" ON public.proposed_assets;

CREATE POLICY "Users can CRUD own proposed_assets" ON public.proposed_assets
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- ============================================
-- TABLE: qa_test_results
-- ============================================
DROP POLICY IF EXISTS "Admin or QA can manage qa_test_results" ON public.qa_test_results;

CREATE POLICY "Admin or QA can manage qa_test_results" ON public.qa_test_results
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qa'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qa'::app_role]));

-- ============================================
-- TABLE: qa_test_runs
-- ============================================
DROP POLICY IF EXISTS "Admin or QA can manage qa_test_runs" ON public.qa_test_runs;

CREATE POLICY "Admin or QA can manage qa_test_runs" ON public.qa_test_runs
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qa'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qa'::app_role]));

-- ============================================
-- TABLE: raid_log_revisions
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own raid_log_revisions" ON public.raid_log_revisions;

CREATE POLICY "Users can CRUD own raid_log_revisions" ON public.raid_log_revisions
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- ============================================
-- TABLE: rate_limit_overrides
-- ============================================
DROP POLICY IF EXISTS "Admins can manage rate limit overrides" ON public.rate_limit_overrides;

CREATE POLICY "Admins can manage rate limit overrides" ON public.rate_limit_overrides
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABLE: resume_prompt_styles
-- ============================================
DROP POLICY IF EXISTS "Admins can manage prompt styles" ON public.resume_prompt_styles;
DROP POLICY IF EXISTS "Authenticated can read active styles" ON public.resume_prompt_styles;

CREATE POLICY "Admins can manage prompt styles" ON public.resume_prompt_styles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read active styles" ON public.resume_prompt_styles
  FOR SELECT TO authenticated
  USING ((is_active = true) AND (deleted_at IS NULL));

-- ============================================
-- TABLE: resume_revisions
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own resume_revisions" ON public.resume_revisions;

CREATE POLICY "Users can CRUD own resume_revisions" ON public.resume_revisions
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- ============================================
-- TABLE: roadmap_revisions
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own roadmap_revisions" ON public.roadmap_revisions;

CREATE POLICY "Users can CRUD own roadmap_revisions" ON public.roadmap_revisions
  FOR ALL TO authenticated
  USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- ============================================
-- TABLE: system_documents
-- ============================================
DROP POLICY IF EXISTS "Admins can manage system documents" ON public.system_documents;
DROP POLICY IF EXISTS "Authenticated users can read system documents" ON public.system_documents;

CREATE POLICY "Admins can manage system documents" ON public.system_documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read system documents" ON public.system_documents
  FOR SELECT TO authenticated
  USING (true);

-- ============================================
-- TABLE: test_users
-- ============================================
DROP POLICY IF EXISTS "Admins can CRUD own test users" ON public.test_users;

CREATE POLICY "Admins can CRUD own test users" ON public.test_users
  FOR ALL TO authenticated
  USING ((admin_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((admin_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABLE: user_resumes
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own resumes" ON public.user_resumes;

CREATE POLICY "Users can CRUD own resumes" ON public.user_resumes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- TABLE: user_roles
-- ============================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- TABLE: user_style_preferences
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own style preferences" ON public.user_style_preferences;

CREATE POLICY "Users can CRUD own style preferences" ON public.user_style_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- TABLE: user_subscriptions (CRITICAL: remove user UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;

CREATE POLICY "Admins can manage subscriptions" ON public.user_subscriptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own subscription" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- NOTE: User UPDATE policy intentionally removed to prevent self-escalation
