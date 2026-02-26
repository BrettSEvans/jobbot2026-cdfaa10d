CREATE TABLE public.cover_letter_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  cover_letter TEXT NOT NULL,
  label TEXT DEFAULT '',
  revision_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cover_letter_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to cover_letter_revisions" ON public.cover_letter_revisions FOR ALL USING (true) WITH CHECK (true);