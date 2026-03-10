
CREATE POLICY "Marketing can read profiles for attribution"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'marketing'::app_role])
  );
