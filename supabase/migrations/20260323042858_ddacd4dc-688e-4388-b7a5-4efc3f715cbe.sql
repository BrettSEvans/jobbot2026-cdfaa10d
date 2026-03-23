
-- Add clarity_resume_html column to job_applications
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS clarity_resume_html text;

-- Add resume_type column to resume_revisions to distinguish ATS vs Clarity
ALTER TABLE public.resume_revisions ADD COLUMN IF NOT EXISTS resume_type text NOT NULL DEFAULT 'ats';
