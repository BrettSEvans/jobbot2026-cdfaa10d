
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_source jsonb DEFAULT NULL;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
