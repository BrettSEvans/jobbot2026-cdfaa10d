
-- =====================================================
-- Convert ALL 43 RLS policies from RESTRICTIVE to PERMISSIVE
-- Fix dashboard_templates SELECT to scope user-owned rows
-- Add trigger to prevent users from self-approving
-- =====================================================

-- 1. admin_audit_log
DROP POLICY IF EXISTS "Admins can insert audit entries" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can insert audit entries" ON public.admin_audit_log FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. architecture_diagram_revisions
DROP POLICY IF EXISTS "Users can CRUD own architecture_diagram_revisions" ON public.architecture_diagram_revisions;
CREATE POLICY "Users can CRUD own architecture_diagram_revisions" ON public.architecture_diagram_revisions FOR ALL TO authenticated USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid())) WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 3. cover_letter_revisions
DROP POLICY IF EXISTS "Users can CRUD own cover_letter_revisions" ON public.cover_letter_revisions;
CREATE POLICY "Users can CRUD own cover_letter_revisions" ON public.cover_letter_revisions FOR ALL TO authenticated USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid())) WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 4. dashboard_revisions
DROP POLICY IF EXISTS "Users can CRUD own dashboard_revisions" ON public.dashboard_revisions;
CREATE POLICY "Users can CRUD own dashboard_revisions" ON public.dashboard_revisions FOR ALL TO authenticated USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid())) WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 5. dashboard_templates (FIX: scope SELECT to own + global templates)
DROP POLICY IF EXISTS "Anyone can read templates" ON public.dashboard_templates;
DROP POLICY IF EXISTS "Users can delete own templates or admins" ON public.dashboard_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.dashboard_templates;
CREATE POLICY "Users can read own or global templates" ON public.dashboard_templates FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own templates or admins" ON public.dashboard_templates FOR DELETE TO authenticated USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own templates" ON public.dashboard_templates FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()) OR (user_id IS NULL));

-- 6. executive_report_revisions
DROP POLICY IF EXISTS "Users can CRUD own executive_report_revisions" ON public.executive_report_revisions;
CREATE POLICY "Users can CRUD own executive_report_revisions" ON public.executive_report_revisions FOR ALL TO authenticated USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid())) WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 7. generated_asset_revisions
DROP POLICY IF EXISTS "Users can CRUD own generated_asset_revisions" ON public.generated_asset_revisions;
CREATE POLICY "Users can CRUD own generated_asset_revisions" ON public.generated_asset_revisions FOR ALL TO authenticated USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid())) WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 8. generated_assets
DROP POLICY IF EXISTS "Users can CRUD own generated_assets" ON public.generated_assets;
CREATE POLICY "Users can CRUD own generated_assets" ON public.generated_assets FOR ALL TO authenticated USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid())) WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 9. generation_usage
DROP POLICY IF EXISTS "Admins can view all usage" ON public.generation_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.generation_usage;
DROP POLICY IF EXISTS "Users can view own usage" ON public.generation_usage;
CREATE POLICY "Admins can view all usage" ON public.generation_usage FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own usage" ON public.generation_usage FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own usage" ON public.generation_usage FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 10. job_applications
DROP POLICY IF EXISTS "Users can CRUD active applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can permanently delete own trashed applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can update own deleted applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can view own deleted applications" ON public.job_applications;
CREATE POLICY "Users can CRUD active applications" ON public.job_applications FOR ALL TO authenticated USING ((user_id = auth.uid()) AND (deleted_at IS NULL)) WITH CHECK ((user_id = auth.uid()) AND (deleted_at IS NULL));
CREATE POLICY "Users can permanently delete own trashed applications" ON public.job_applications FOR DELETE TO authenticated USING ((user_id = auth.uid()) AND (deleted_at IS NOT NULL));
CREATE POLICY "Users can update own deleted applications" ON public.job_applications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own deleted applications" ON public.job_applications FOR SELECT TO authenticated USING ((user_id = auth.uid()) AND (deleted_at IS NOT NULL));

-- 11. pipeline_stage_history
DROP POLICY IF EXISTS "Users can CRUD own stage history" ON public.pipeline_stage_history;
CREATE POLICY "Users can CRUD own stage history" ON public.pipeline_stage_history FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 12. profiles (FIX: add trigger to prevent self-approval)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update approval status" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update approval status" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Trigger to prevent non-admins from modifying approval_status
CREATE OR REPLACE FUNCTION public.protect_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change approval_status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_approval_status_trigger ON public.profiles;
CREATE TRIGGER protect_approval_status_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_approval_status();

-- 13. prompt_log
DROP POLICY IF EXISTS "Admins can manage prompt_log" ON public.prompt_log;
CREATE POLICY "Admins can manage prompt_log" ON public.prompt_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 14. proposed_assets
DROP POLICY IF EXISTS "Users can CRUD own proposed_assets" ON public.proposed_assets;
CREATE POLICY "Users can CRUD own proposed_assets" ON public.proposed_assets FOR ALL TO authenticated USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid())) WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 15. qa_test_results
DROP POLICY IF EXISTS "Admin or QA can manage qa_test_results" ON public.qa_test_results;
CREATE POLICY "Admin or QA can manage qa_test_results" ON public.qa_test_results FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qa'::app_role])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qa'::app_role]));

-- 16. qa_test_runs
DROP POLICY IF EXISTS "Admin or QA can manage qa_test_runs" ON public.qa_test_runs;
CREATE POLICY "Admin or QA can manage qa_test_runs" ON public.qa_test_runs FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qa'::app_role])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qa'::app_role]));

-- 17. raid_log_revisions
DROP POLICY IF EXISTS "Users can CRUD own raid_log_revisions" ON public.raid_log_revisions;
CREATE POLICY "Users can CRUD own raid_log_revisions" ON public.raid_log_revisions FOR ALL TO authenticated USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid())) WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 18. rate_limit_overrides
DROP POLICY IF EXISTS "Admins can manage rate limit overrides" ON public.rate_limit_overrides;
CREATE POLICY "Admins can manage rate limit overrides" ON public.rate_limit_overrides FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 19. resume_prompt_styles
DROP POLICY IF EXISTS "Admins can manage prompt styles" ON public.resume_prompt_styles;
DROP POLICY IF EXISTS "Authenticated can read active styles" ON public.resume_prompt_styles;
CREATE POLICY "Admins can manage prompt styles" ON public.resume_prompt_styles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read active styles" ON public.resume_prompt_styles FOR SELECT TO authenticated USING ((is_active = true) AND (deleted_at IS NULL));

-- 20. resume_revisions
DROP POLICY IF EXISTS "Users can CRUD own resume_revisions" ON public.resume_revisions;
CREATE POLICY "Users can CRUD own resume_revisions" ON public.resume_revisions FOR ALL TO authenticated USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid())) WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 21. roadmap_revisions
DROP POLICY IF EXISTS "Users can CRUD own roadmap_revisions" ON public.roadmap_revisions;
CREATE POLICY "Users can CRUD own roadmap_revisions" ON public.roadmap_revisions FOR ALL TO authenticated USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid())) WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 22. system_documents
DROP POLICY IF EXISTS "Admins can manage system documents" ON public.system_documents;
DROP POLICY IF EXISTS "Authenticated users can read system documents" ON public.system_documents;
CREATE POLICY "Admins can manage system documents" ON public.system_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read system documents" ON public.system_documents FOR SELECT TO authenticated USING (true);

-- 23. test_users
DROP POLICY IF EXISTS "Admins can CRUD own test users" ON public.test_users;
CREATE POLICY "Admins can CRUD own test users" ON public.test_users FOR ALL TO authenticated USING ((admin_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK ((admin_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- 24. user_resumes
DROP POLICY IF EXISTS "Users can CRUD own resumes" ON public.user_resumes;
CREATE POLICY "Users can CRUD own resumes" ON public.user_resumes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 25. user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 26. user_style_preferences
DROP POLICY IF EXISTS "Users can CRUD own style preferences" ON public.user_style_preferences;
CREATE POLICY "Users can CRUD own style preferences" ON public.user_style_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 27. user_subscriptions
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;
CREATE POLICY "Admins can manage subscriptions" ON public.user_subscriptions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own subscription" ON public.user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
