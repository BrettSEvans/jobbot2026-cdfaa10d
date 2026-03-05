
-- Atomic delete-and-reassign function
CREATE OR REPLACE FUNCTION public.delete_and_reassign_resume(p_resume_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_was_active boolean;
  v_next_id uuid;
  v_storage_path text;
BEGIN
  -- Get resume info and verify ownership
  SELECT user_id, is_active, storage_path
  INTO v_user_id, v_was_active, v_storage_path
  FROM public.user_resumes
  WHERE id = p_resume_id AND user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Resume not found or not owned by user';
  END IF;

  -- Delete the record
  DELETE FROM public.user_resumes WHERE id = p_resume_id;

  -- If deleted resume was active, promote the most recent remaining one
  IF v_was_active THEN
    SELECT id INTO v_next_id
    FROM public.user_resumes
    WHERE user_id = v_user_id
    ORDER BY uploaded_at DESC
    LIMIT 1;

    IF v_next_id IS NOT NULL THEN
      UPDATE public.user_resumes SET is_active = true WHERE id = v_next_id;
    END IF;
  END IF;
END;
$$;

-- Configure 10MB file size limit on resume-uploads bucket
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'resume-uploads';
