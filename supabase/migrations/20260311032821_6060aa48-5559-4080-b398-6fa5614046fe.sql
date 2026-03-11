-- Update column default for new subscriptions to 7-day trial
ALTER TABLE public.user_subscriptions 
  ALTER COLUMN current_period_end SET DEFAULT (now() + interval '7 days');

-- Update handle_new_user trigger to set 7-day trial period
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_utm_campaign text;
  v_approval text;
BEGIN
  v_utm_campaign := NEW.raw_user_meta_data->>'utm_campaign';

  IF LOWER(NEW.email) IN ('lisalink88@hotmail.com', 'sshanbron@yahoo.com') THEN
    v_approval := 'approved';
  ELSIF v_utm_campaign IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE utm_campaign = v_utm_campaign
    AND (max_signups IS NULL OR max_signups > (
      SELECT count(*) FROM public.profiles
      WHERE referral_source->>'utm_campaign' = v_utm_campaign
    ))
  ) THEN
    v_approval := 'approved';
  ELSE
    v_approval := 'pending';
  END IF;

  INSERT INTO public.profiles (id, display_name, avatar_url, email, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    LOWER(NEW.email),
    v_approval
  );

  INSERT INTO public.user_subscriptions (user_id, tier, status, current_period_end)
  VALUES (NEW.id, 'free', 'active', now() + interval '7 days');

  -- Auto-assign 'customer' role to every new user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;