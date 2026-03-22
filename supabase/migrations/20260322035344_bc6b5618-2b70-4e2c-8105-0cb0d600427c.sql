
-- Create a security definer function to check if a user owns an application
-- This avoids nested RLS issues when revision tables subquery job_applications
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
      AND user_id = auth.uid()
  )
$$;

-- Drop and recreate RLS policies for ALL revision tables to use the new function

-- generated_asset_revisions
DROP POLICY IF EXISTS "Users can CRUD own generated_asset_revisions" ON public.generated_asset_revisions;
CREATE POLICY "Users can CRUD own generated_asset_revisions"
  ON public.generated_asset_revisions FOR ALL
  TO authenticated
  USING (public.owns_application(application_id))
  WITH CHECK (public.owns_application(application_id));

-- resume_revisions
DROP POLICY IF EXISTS "Users can CRUD own resume_revisions" ON public.resume_revisions;
CREATE POLICY "Users can CRUD own resume_revisions"
  ON public.resume_revisions FOR ALL
  TO authenticated
  USING (public.owns_application(application_id))
  WITH CHECK (public.owns_application(application_id));

-- cover_letter_revisions
DROP POLICY IF EXISTS "Users can CRUD own cover_letter_revisions" ON public.cover_letter_revisions;
CREATE POLICY "Users can CRUD own cover_letter_revisions"
  ON public.cover_letter_revisions FOR ALL
  TO authenticated
  USING (public.owns_application(application_id))
  WITH CHECK (public.owns_application(application_id));

-- dashboard_revisions
DROP POLICY IF EXISTS "Users can CRUD own dashboard_revisions" ON public.dashboard_revisions;
CREATE POLICY "Users can CRUD own dashboard_revisions"
  ON public.dashboard_revisions FOR ALL
  TO authenticated
  USING (public.owns_application(application_id))
  WITH CHECK (public.owns_application(application_id));

-- roadmap_revisions
DROP POLICY IF EXISTS "Users can CRUD own roadmap_revisions" ON public.roadmap_revisions;
CREATE POLICY "Users can CRUD own roadmap_revisions"
  ON public.roadmap_revisions FOR ALL
  TO authenticated
  USING (public.owns_application(application_id))
  WITH CHECK (public.owns_application(application_id));

-- raid_log_revisions
DROP POLICY IF EXISTS "Users can CRUD own raid_log_revisions" ON public.raid_log_revisions;
CREATE POLICY "Users can CRUD own raid_log_revisions"
  ON public.raid_log_revisions FOR ALL
  TO authenticated
  USING (public.owns_application(application_id))
  WITH CHECK (public.owns_application(application_id));

-- architecture_diagram_revisions
DROP POLICY IF EXISTS "Users can CRUD own architecture_diagram_revisions" ON public.architecture_diagram_revisions;
CREATE POLICY "Users can CRUD own architecture_diagram_revisions"
  ON public.architecture_diagram_revisions FOR ALL
  TO authenticated
  USING (public.owns_application(application_id))
  WITH CHECK (public.owns_application(application_id));

-- executive_report_revisions
DROP POLICY IF EXISTS "Users can CRUD own executive_report_revisions" ON public.executive_report_revisions;
CREATE POLICY "Users can CRUD own executive_report_revisions"
  ON public.executive_report_revisions FOR ALL
  TO authenticated
  USING (public.owns_application(application_id))
  WITH CHECK (public.owns_application(application_id));

-- Also fix the same pattern on other tables that use the subquery approach:
-- proposed_assets
DROP POLICY IF EXISTS "Users can CRUD own proposed_assets" ON public.proposed_assets;
CREATE POLICY "Users can CRUD own proposed_assets"
  ON public.proposed_assets FOR ALL
  TO authenticated
  USING (public.owns_application(application_id))
  WITH CHECK (public.owns_application(application_id));

-- generated_assets
DROP POLICY IF EXISTS "Users can CRUD own generated_assets" ON public.generated_assets;
CREATE POLICY "Users can CRUD own generated_assets"
  ON public.generated_assets FOR ALL
  TO authenticated
  USING (public.owns_application(application_id))
  WITH CHECK (public.owns_application(application_id));

-- asset_download_signals
DROP POLICY IF EXISTS "Users can insert own download signals" ON public.asset_download_signals;
CREATE POLICY "Users can insert own download signals"
  ON public.asset_download_signals FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_application(application_id));
