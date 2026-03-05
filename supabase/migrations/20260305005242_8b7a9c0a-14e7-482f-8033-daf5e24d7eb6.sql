
CREATE OR REPLACE FUNCTION public.admin_soft_delete_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  -- Soft-delete the user's profile by setting approval_status to 'deleted'
  UPDATE public.profiles
  SET approval_status = 'deleted',
      updated_at = now()
  WHERE id = _target_user_id;

  -- Soft-delete all their job applications
  UPDATE public.job_applications
  SET deleted_at = now(),
      deleted_by = auth.uid()
  WHERE user_id = _target_user_id
    AND deleted_at IS NULL;

  -- Log to audit
  INSERT INTO public.admin_audit_log (admin_id, action, target_id, metadata)
  VALUES (
    auth.uid(),
    'delete_user',
    _target_user_id::text,
    jsonb_build_object('user_id', _target_user_id::text)
  );
END;
$$;
