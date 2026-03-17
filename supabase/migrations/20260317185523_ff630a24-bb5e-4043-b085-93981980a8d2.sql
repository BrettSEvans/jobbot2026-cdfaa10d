
-- Sprints: allow admins full access
DROP POLICY "Users can CRUD own sprints" ON public.sprints;
CREATE POLICY "Users can CRUD own sprints" ON public.sprints FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Epics: allow admins full access
DROP POLICY "Users can CRUD own epics" ON public.epics;
CREATE POLICY "Users can CRUD own epics" ON public.epics FOR ALL TO authenticated
  USING (sprint_id IN (SELECT id FROM sprints WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (sprint_id IN (SELECT id FROM sprints WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Stories: allow admins full access
DROP POLICY "Users can CRUD own stories" ON public.stories;
CREATE POLICY "Users can CRUD own stories" ON public.stories FOR ALL TO authenticated
  USING (epic_id IN (SELECT e.id FROM epics e JOIN sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (epic_id IN (SELECT e.id FROM epics e JOIN sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Story comments: allow admins full access
DROP POLICY "Users can CRUD own story comments" ON public.story_comments;
CREATE POLICY "Users can CRUD own story comments" ON public.story_comments FOR ALL TO authenticated
  USING (story_id IN (SELECT st.id FROM stories st JOIN epics e ON st.epic_id = e.id JOIN sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (story_id IN (SELECT st.id FROM stories st JOIN epics e ON st.epic_id = e.id JOIN sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Story links: allow admins full access
DROP POLICY "Users can CRUD own story links" ON public.story_links;
CREATE POLICY "Users can CRUD own story links" ON public.story_links FOR ALL TO authenticated
  USING (source_story_id IN (SELECT st.id FROM stories st JOIN epics e ON st.epic_id = e.id JOIN sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (source_story_id IN (SELECT st.id FROM stories st JOIN epics e ON st.epic_id = e.id JOIN sprints s ON e.sprint_id = s.id WHERE s.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
