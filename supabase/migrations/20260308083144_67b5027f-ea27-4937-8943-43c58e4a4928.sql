
-- QA Test Runs table
CREATE TABLE public.qa_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_label text NOT NULL,
  build_timestamp timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'in_progress'
);

ALTER TABLE public.qa_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage qa_test_runs"
  ON public.qa_test_runs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- QA Test Results table
CREATE TABLE public.qa_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.qa_test_runs(id) ON DELETE CASCADE,
  test_case_id text NOT NULL,
  result text NOT NULL DEFAULT 'pass',
  failure_notes text,
  regression_ticket text,
  regression_fixed_at timestamptz,
  tested_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qa_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage qa_test_results"
  ON public.qa_test_results FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Unique constraint: one result per test case per run
CREATE UNIQUE INDEX uq_qa_test_results_run_case ON public.qa_test_results (run_id, test_case_id);
