-- Add phone and linkedin_url columns to profiles
ALTER TABLE public.profiles ADD COLUMN phone text;
ALTER TABLE public.profiles ADD COLUMN linkedin_url text;

-- Partial unique indexes (only enforce when non-null)
CREATE UNIQUE INDEX idx_profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX idx_profiles_linkedin_url_unique ON public.profiles (linkedin_url) WHERE linkedin_url IS NOT NULL;

-- Function to check if contact info already exists on another profile
CREATE OR REPLACE FUNCTION public.check_duplicate_trial_signup(p_email text DEFAULT NULL, p_phone text DEFAULT NULL, p_linkedin text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE (
      (p_phone IS NOT NULL AND phone = p_phone)
      OR (p_linkedin IS NOT NULL AND linkedin_url = p_linkedin)
      OR (p_email IS NOT NULL AND email = p_email)
    )
  )
$$;