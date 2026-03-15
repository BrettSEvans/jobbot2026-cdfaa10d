import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const STATUSES = ["backlog", "todo", "in_progress", "review", "done"] as const;
export type StoryStatus = (typeof STATUSES)[number];

export interface Story {
  id: string;
  epic_id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: StoryStatus;
  priority: string;
  story_points: number | null;
  persona: string | null;
  story_order: number;
  source: string;
  lovable_prompt: string | null;
  parent_story_id: string | null;
  lexical_order: string | null;
  labels: string[];
  due_date: string | null;
  assigned_to: string | null;
  story_tokens: number | null;
  created_at: string | null;
  updated_at: string | null;
}

const PAGE_SIZE = 1000;

async function fetchAllStories(epicIds?: string[]): Promise<Story[]> {
  const allRows: any[] = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from("stories")
      .select("*")
      .is("parent_story_id", null)
      .order("lexical_order", { ascending: true, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1);
    if (epicIds && epicIds.length > 0) q = q.in("epic_id", epicIds);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data ?? [];
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows.map((d: any) => ({ ...d, labels: d.labels ?? [] })) as Story[];
}

export function useStories(epicIds?: string[]) {
  return useQuery({
    queryKey: ["stories", epicIds ?? "all"],
    staleTime: 30_000,
    queryFn: () => fetchAllStories(epicIds),
  });
}

export function useSubTasks(parentId: string | undefined) {
  return useQuery({
    queryKey: ["subtasks", parentId],
    enabled: !!parentId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("parent_story_id", parentId!)
        .order("story_order");
      if (error) throw error;
      return (data ?? []).map((d: any) => ({ ...d, labels: d.labels ?? [] })) as Story[];
    },
  });
}

export function useSubTaskCounts(storyIds: string[]) {
  return useQuery({
    queryKey: ["subtask_counts", storyIds],
    enabled: storyIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("parent_story_id, status")
        .in("parent_story_id", storyIds);
      if (error) throw error;
      const counts: Record<string, { total: number; done: number }> = {};
      (data ?? []).forEach((s) => {
        const pid = s.parent_story_id!;
        if (!counts[pid]) counts[pid] = { total: 0, done: 0 };
        counts[pid].total++;
        if (s.status === "done") counts[pid].done++;
      });
      return counts;
    },
  });
}

export function useUpdateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _oldStory, ...updates }: Partial<Story> & { id: string; _oldStory?: Story }) => {
      const { data, error } = await supabase
        .from("stories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: ["stories"] });
      const prev = qc.getQueriesData({ queryKey: ["stories"] });
      qc.setQueriesData({ queryKey: ["stories"] }, (old: Story[] | undefined) => {
        if (!old) return old;
        return old.map((s) => (s.id === variables.id ? { ...s, ...variables } : s));
      });
      return { prev, oldStory: variables._oldStory };
    },
    onSuccess: async (_data, variables, context: any) => {
      const old = context?.oldStory as Story | undefined;
      if (old) {
        const changes: string[] = [];
        if (variables.status && variables.status !== old.status) {
          changes.push(`Status changed from ${old.status} to ${variables.status}`);
        }
        if (variables.priority && variables.priority !== old.priority) {
          changes.push(`Priority changed from ${old.priority} to ${variables.priority}`);
        }
        if (changes.length > 0) {
          await supabase.from("story_comments").insert({
            story_id: variables.id,
            content: changes.join(". "),
            author_name: "System",
          });
        }
      }
    },
    onError: (_err, _vars, context: any) => {
      context?.prev?.forEach(([key, data]: [any, any]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["subtasks"] });
    },
  });
}

export function useCreateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (story: {
      epic_id: string;
      title: string;
      description?: string;
      acceptance_criteria?: string;
      status?: string;
      priority?: string;
      story_points?: number;
      persona?: string;
      source?: string;
      lovable_prompt?: string;
      parent_story_id?: string;
      lexical_order?: string;
      labels?: string[];
      due_date?: string;
    }) => {
      const { data, error } = await supabase
        .from("stories")
        .insert(story)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["subtasks"] });
      qc.invalidateQueries({ queryKey: ["subtask_counts"] });
    },
  });
}

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["subtasks"] });
      qc.invalidateQueries({ queryKey: ["subtask_counts"] });
    },
  });
}
