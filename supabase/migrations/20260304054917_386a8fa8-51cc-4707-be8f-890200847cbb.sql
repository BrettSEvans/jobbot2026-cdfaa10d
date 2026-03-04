
-- Add soft-delete columns to job_applications
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Drop the existing ALL policy
DROP POLICY IF EXISTS "Users can CRUD own applications" ON public.job_applications;

-- Active applications: normal CRUD where deleted_at IS NULL
CREATE POLICY "Users can CRUD active applications"
  ON public.job_applications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid() AND deleted_at IS NULL);

-- Allow users to see their own deleted applications (for trash view)
CREATE POLICY "Users can view own deleted applications"
  ON public.job_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NOT NULL);

-- Allow users to update their own deleted applications (for restore and soft-delete)
CREATE POLICY "Users can update own deleted applications"
  ON public.job_applications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow users to permanently delete their own trashed applications
CREATE POLICY "Users can permanently delete own trashed applications"
  ON public.job_applications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NOT NULL);
