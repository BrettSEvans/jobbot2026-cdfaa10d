
-- Add persona_id to job_applications to track which persona created the application
ALTER TABLE public.job_applications ADD COLUMN persona_id uuid DEFAULT NULL;

-- Add user_id and persona_id to dashboard_templates for per-persona ownership
ALTER TABLE public.dashboard_templates ADD COLUMN user_id uuid DEFAULT NULL;
ALTER TABLE public.dashboard_templates ADD COLUMN persona_id uuid DEFAULT NULL;

-- Index for fast filtering
CREATE INDEX idx_job_applications_persona_id ON public.job_applications (user_id, persona_id);
CREATE INDEX idx_dashboard_templates_user_persona ON public.dashboard_templates (user_id, persona_id);
