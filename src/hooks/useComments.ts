import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface StoryComment {
  id: string;
  story_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export function useComments(storyId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!storyId) return;
    const channel = supabase
      .channel(`comments-${storyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "story_comments", filter: `story_id=eq.${storyId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["comments", storyId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storyId, qc]);

  return useQuery({
    queryKey: ["comments", storyId],
    enabled: !!storyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_comments")
        .select("*")
        .eq("story_id", storyId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StoryComment[];
    },
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: { story_id: string; content: string; author_name?: string }) => {
      const { data, error } = await supabase
        .from("story_comments")
        .insert(comment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["comments", vars.story_id] }),
  });
}
