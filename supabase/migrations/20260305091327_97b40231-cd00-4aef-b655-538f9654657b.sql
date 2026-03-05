
-- 1. Create user_resumes table
CREATE TABLE public.user_resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own resumes"
ON public.user_resumes FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. set_active_resume function (atomic toggle)
CREATE OR REPLACE FUNCTION public.set_active_resume(p_resume_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_resumes SET is_active = false WHERE user_id = auth.uid();
  UPDATE public.user_resumes SET is_active = true WHERE id = p_resume_id AND user_id = auth.uid();
END;
$$;

-- 3. Storage DELETE policy for resume-uploads
CREATE POLICY "Users can delete own resume files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resume-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Add source_resume_id to job_applications
ALTER TABLE public.job_applications ADD COLUMN source_resume_id uuid NULL;
