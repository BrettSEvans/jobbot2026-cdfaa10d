
-- Add snapshot_test_ids to qa_test_runs (nullable for existing runs)
ALTER TABLE public.qa_test_runs
ADD COLUMN snapshot_test_ids jsonb DEFAULT NULL;

-- Create table for QA-added custom test cases
CREATE TABLE public.qa_custom_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id text NOT NULL UNIQUE,
  title text NOT NULL,
  area text NOT NULL DEFAULT 'Custom',
  route text,
  preconditions text[] DEFAULT '{}',
  steps text[] NOT NULL DEFAULT '{}',
  expected_results text[] NOT NULL DEFAULT '{}',
  tags text[] DEFAULT '{}',
  estimated_minutes integer NOT NULL DEFAULT 3,
  requires_auth boolean NOT NULL DEFAULT true,
  requires_admin boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qa_custom_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or QA can manage custom tests"
  ON public.qa_custom_tests
  FOR ALL
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qa'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qa'::app_role]));
