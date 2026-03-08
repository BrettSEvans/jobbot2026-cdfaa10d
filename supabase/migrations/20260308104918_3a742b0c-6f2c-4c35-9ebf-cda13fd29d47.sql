-- Lock down user_subscriptions: remove user INSERT policy
-- Subscriptions are now only created via handle_new_user trigger
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;

-- Add explicit comment for documentation
COMMENT ON TABLE public.user_subscriptions IS 'User subscription tiers. INSERT/UPDATE restricted to triggers and admins only to prevent tier self-escalation.';