
-- 1. Add last_sign_in_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;

-- 2. Update handle_new_user to always approve
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email, approval_status, referral_source)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    LOWER(NEW.email),
    'approved',
    jsonb_build_object(
      'utm_campaign', COALESCE(NEW.raw_user_meta_data->>'utm_campaign', ''),
      'utm_source', COALESCE(NEW.raw_user_meta_data->>'utm_source', ''),
      'utm_medium', COALESCE(NEW.raw_user_meta_data->>'utm_medium', '')
    )
  );

  INSERT INTO public.user_subscriptions (user_id, tier, status, current_period_end)
  VALUES (NEW.id, 'free', 'active', now() + interval '7 days');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 3. Approve all existing pending users
UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status = 'pending';
