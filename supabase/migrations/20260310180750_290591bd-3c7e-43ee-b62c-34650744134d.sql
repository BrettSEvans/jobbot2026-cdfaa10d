
ALTER TABLE public.campaigns ADD COLUMN max_signups integer DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.campaign_auto_approve(_user_id uuid, _utm_campaign text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max integer;
  v_current integer;
BEGIN
  SELECT max_signups INTO v_max
  FROM public.campaigns
  WHERE utm_campaign = _utm_campaign
  LIMIT 1;

  IF NOT FOUND THEN RETURN false; END IF;

  IF v_max IS NOT NULL THEN
    SELECT count(*) INTO v_current
    FROM public.profiles
    WHERE referral_source->>'utm_campaign' = _utm_campaign;
    
    IF v_current >= v_max THEN RETURN false; END IF;
  END IF;

  UPDATE public.profiles
  SET approval_status = 'approved'
  WHERE id = _user_id AND approval_status = 'pending';

  RETURN true;
END;
$$;
