
-- Fix dashboard_templates: scope INSERT and DELETE to owner or admin
DROP POLICY IF EXISTS "Auth users can delete templates" ON public.dashboard_templates;
CREATE POLICY "Users can delete own templates or admins" ON public.dashboard_templates
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Auth users can insert templates" ON public.dashboard_templates;
CREATE POLICY "Users can insert own templates" ON public.dashboard_templates
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
