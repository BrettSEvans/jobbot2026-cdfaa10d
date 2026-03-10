
-- Fix: Only admins can create global templates (user_id IS NULL)
DROP POLICY IF EXISTS "Users can insert own templates" ON public.dashboard_templates;
CREATE POLICY "Users can insert own templates" ON public.dashboard_templates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can insert global templates" ON public.dashboard_templates FOR INSERT TO authenticated WITH CHECK (user_id IS NULL AND has_role(auth.uid(), 'admin'::app_role));
