-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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
      AND role = _role
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Create resume_prompt_styles table
CREATE TABLE public.resume_prompt_styles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text NOT NULL,
    slug text NOT NULL UNIQUE,
    system_prompt text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resume_prompt_styles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active styles
CREATE POLICY "Anyone can read active styles"
ON public.resume_prompt_styles FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage prompt styles"
ON public.resume_prompt_styles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Create resume_revisions table
CREATE TABLE public.resume_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    html text NOT NULL,
    label text DEFAULT ''::text,
    revision_number integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resume_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own resume_revisions"
ON public.resume_revisions FOR ALL
TO authenticated
USING (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()))
WITH CHECK (application_id IN (SELECT id FROM job_applications WHERE user_id = auth.uid()));

-- 7. Add resume columns to job_applications
ALTER TABLE public.job_applications
    ADD COLUMN resume_html text,
    ADD COLUMN resume_style_id uuid;

-- 8. Seed admin user
INSERT INTO public.user_roles (user_id, role)
VALUES ('f8182de6-de8e-4c12-9009-88fb5c4e66b8', 'admin');

-- 9. Seed initial prompt styles
INSERT INTO public.resume_prompt_styles (label, slug, system_prompt, description, sort_order) VALUES
('Traditional Corporate', 'traditional-corporate',
 'You are an expert resume writer specializing in corporate and financial sector resumes. Create a clean, formal, ATS-optimized resume in HTML format. Use a traditional layout with clear sections: Professional Summary, Experience, Education, Skills. Emphasize quantified achievements, leadership, and business impact. Use conservative fonts (Georgia, Times New Roman) and minimal color. The resume MUST fit on exactly one printed page.',
 'Clean, formal format suited for corporate and financial roles', 0),
('Tech Engineering', 'tech-engineering',
 'You are an expert resume writer specializing in technical engineering roles. Create a skills-forward resume in HTML format optimized for tech companies. Lead with a Technical Skills section organized by category. Emphasize projects, open-source contributions, and technical problem-solving. Use a modern, clean layout with monospace accents for technical terms. Include a brief Professional Summary focused on technical expertise. The resume MUST fit on exactly one printed page.',
 'Skills-forward layout emphasizing technical projects and stack', 1),
('Career Changer', 'career-changer',
 'You are an expert resume writer specializing in career transition resumes. Create a functional/hybrid resume in HTML format that highlights transferable skills over chronological history. Lead with a compelling Professional Summary that bridges the career gap. Use a Skills & Accomplishments section organized by capability area rather than by employer. Reframe prior experience to align with the target role. The resume MUST fit on exactly one printed page.',
 'Highlights transferable skills and reframes prior experience', 2),
('Creative & Design', 'creative-design',
 'You are an expert resume writer specializing in creative and marketing roles. Create a visually distinctive resume in HTML format that demonstrates design sensibility. Use the company brand colors subtly. Include visual hierarchy, tasteful use of color blocks, and modern typography. Balance creativity with readability. Include sections for Portfolio highlights and Creative Tools alongside experience. The resume MUST fit on exactly one printed page.',
 'Visually distinctive layout for creative and marketing roles', 3),
('Executive Leadership', 'executive-leadership',
 'You are an expert resume writer specializing in C-suite and VP-level resumes. Create an achievement-focused executive resume in HTML format. Lead with an Executive Profile summarizing leadership scope, P&L responsibility, and strategic wins. Use a Board-ready format with Key Achievements section highlighting company-level impact (revenue growth, market expansion, organizational transformation). Emphasize leadership scale (team sizes, budgets managed). Use premium, authoritative typography. The resume MUST fit on exactly one printed page.',
 'Achievement-focused format for senior and C-level positions', 4);

-- 10. Enable realtime for resume_prompt_styles (admin needs it)
ALTER PUBLICATION supabase_realtime ADD TABLE public.resume_prompt_styles;