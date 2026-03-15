import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoryTemplate {
  id: string;
  name: string;
  description: string | null;
  acceptance_criteria: string | null;
  labels: string[];
  priority: string;
  created_at: string | null;
}

export function useStoryTemplates() {
  return useQuery({
    queryKey: ["story_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as StoryTemplate[];
    },
  });
}

export function useCreateStoryTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { name: string; description?: string; acceptance_criteria?: string; labels?: string[]; priority?: string }) => {
      const { data, error } = await supabase
        .from("story_templates")
        .insert(t)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["story_templates"] }),
  });
}
