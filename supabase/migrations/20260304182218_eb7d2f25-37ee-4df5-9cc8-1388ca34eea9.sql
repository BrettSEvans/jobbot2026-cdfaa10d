
-- 1. Add email and approval_status columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- 2. Bulk-approve ALL existing users
UPDATE public.profiles SET approval_status = 'approved';

-- 3. Update handle_new_user trigger to store email and auto-approve whitelisted emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    LOWER(NEW.email),
    CASE
      WHEN LOWER(NEW.email) IN ('lisalink88@hotmail.com', 'sshanbron@yahoo.com')
      THEN 'approved'
      ELSE 'pending'
    END
  );
  RETURN NEW;
END;
$$;

-- 4. Admin RLS: allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Admin RLS: allow admins to update approval_status on any profile
CREATE POLICY "Admins can update approval status"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
