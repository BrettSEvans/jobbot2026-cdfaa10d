
-- Table for storing system-wide documents (e.g., generation guide)
CREATE TABLE public.system_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_documents ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read system documents (needed for generation)
CREATE POLICY "Authenticated users can read system documents"
  ON public.system_documents FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage system documents"
  ON public.system_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the generation guide document
INSERT INTO public.system_documents (slug, title, content) VALUES (
  'resume-cover-letter-guide',
  'Resume & Cover Letter Generation Guide',
  ''
);
