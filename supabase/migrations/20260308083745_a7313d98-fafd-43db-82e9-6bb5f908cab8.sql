
-- Create has_any_role() security definer function
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Update QA table RLS to allow both admin and qa roles
DROP POLICY IF EXISTS "Admins can manage qa_test_runs" ON public.qa_test_runs;
CREATE POLICY "Admin or QA can manage qa_test_runs"
ON public.qa_test_runs
FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','qa']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','qa']::app_role[]));

DROP POLICY IF EXISTS "Admins can manage qa_test_results" ON public.qa_test_results;
CREATE POLICY "Admin or QA can manage qa_test_results"
ON public.qa_test_results
FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','qa']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','qa']::app_role[]));
