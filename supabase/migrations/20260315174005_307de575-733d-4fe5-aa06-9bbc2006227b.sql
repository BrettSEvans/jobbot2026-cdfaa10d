
-- Sprints table
CREATE TABLE public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sprint_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  start_date date,
  end_date date,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own sprints" ON public.sprints FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Epics table
CREATE TABLE public.epics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid REFERENCES public.sprints(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  epic_order integer NOT NULL DEFAULT 0,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own epics" ON public.epics FOR ALL TO authenticated
  USING (sprint_id IN (SELECT id FROM public.sprints WHERE user_id = auth.uid()))
  WITH CHECK (sprint_id IN (SELECT id FROM public.sprints WHERE user_id = auth.uid()));

-- Stories table
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id uuid REFERENCES public.epics(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  acceptance_criteria text,
  status text NOT NULL DEFAULT 'backlog',
  priority text NOT NULL DEFAULT 'medium',
  story_points integer,
  persona text,
  story_order integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'chat',
  lovable_prompt text,
  parent_story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  lexical_order text,
  labels text[] DEFAULT '{}',
  due_date date,
  assigned_to uuid,
  story_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own stories" ON public.stories FOR ALL TO authenticated
  USING (epic_id IN (SELECT e.id FROM public.epics e JOIN public.sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()))
  WITH CHECK (epic_id IN (SELECT e.id FROM public.epics e JOIN public.sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()));

-- Story comments table
CREATE TABLE public.story_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  author_name text NOT NULL DEFAULT 'User',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own story comments" ON public.story_comments FOR ALL TO authenticated
  USING (story_id IN (SELECT st.id FROM public.stories st JOIN public.epics e ON st.epic_id = e.id JOIN public.sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()))
  WITH CHECK (story_id IN (SELECT st.id FROM public.stories st JOIN public.epics e ON st.epic_id = e.id JOIN public.sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()));

-- Enable realtime for story_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_comments;

-- Story links table
CREATE TABLE public.story_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  target_story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  link_type text NOT NULL DEFAULT 'relates_to',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_story_id, target_story_id, link_type)
);
ALTER TABLE public.story_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own story links" ON public.story_links FOR ALL TO authenticated
  USING (source_story_id IN (SELECT st.id FROM public.stories st JOIN public.epics e ON st.epic_id = e.id JOIN public.sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()))
  WITH CHECK (source_story_id IN (SELECT st.id FROM public.stories st JOIN public.epics e ON st.epic_id = e.id JOIN public.sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()));

-- Story templates table
CREATE TABLE public.story_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  acceptance_criteria text,
  labels text[] DEFAULT '{}',
  priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.story_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD story templates" ON public.story_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- RPC function: get_sprint_story_counts
CREATE OR REPLACE FUNCTION public.get_sprint_story_counts()
RETURNS TABLE(sprint_id uuid, total bigint, done bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    s.id AS sprint_id,
    COUNT(st.id) AS total,
    COUNT(st.id) FILTER (WHERE st.status = 'done') AS done
  FROM public.sprints s
  JOIN public.epics e ON e.sprint_id = s.id
  JOIN public.stories st ON st.epic_id = e.id AND st.parent_story_id IS NULL
  WHERE s.user_id = auth.uid()
  GROUP BY s.id
$$;
