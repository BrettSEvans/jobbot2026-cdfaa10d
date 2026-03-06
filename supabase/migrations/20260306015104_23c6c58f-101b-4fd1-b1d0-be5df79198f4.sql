
-- Phase 2+3 schema changes for Maui Plan

-- ATS Match Score columns
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS ats_score jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ats_scored_at timestamptz DEFAULT NULL;

-- Pipeline stages columns
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz DEFAULT now();

-- Selective asset generation column
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS selected_assets jsonb DEFAULT NULL;

-- Pipeline stage history table for funnel analytics
CREATE TABLE IF NOT EXISTS pipeline_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE pipeline_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own stage history"
  ON pipeline_stage_history FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Onboarding tracking on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz DEFAULT NULL;
