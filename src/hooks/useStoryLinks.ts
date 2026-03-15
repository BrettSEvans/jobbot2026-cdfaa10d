import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LinkType = "blocks" | "relates_to" | "duplicates";

export interface StoryLink {
  id: string;
  source_story_id: string;
  target_story_id: string;
  link_type: LinkType;
  created_at: string;
  source_title?: string;
  target_title?: string;
}

export function useStoryLinks(storyId: string | undefined) {
  return useQuery({
    queryKey: ["story_links", storyId],
    enabled: !!storyId,
    queryFn: async () => {
      const { data: asSource, error: e1 } = await supabase
        .from("story_links")
        .select("*")
        .eq("source_story_id", storyId!);
      if (e1) throw e1;

      const { data: asTarget, error: e2 } = await supabase
        .from("story_links")
        .select("*")
        .eq("target_story_id", storyId!);
      if (e2) throw e2;

      const relatedIds = new Set<string>();
      [...(asSource ?? []), ...(asTarget ?? [])].forEach((l) => {
        relatedIds.add(l.source_story_id);
        relatedIds.add(l.target_story_id);
      });
      relatedIds.delete(storyId!);

      let titleMap: Record<string, string> = {};
      if (relatedIds.size > 0) {
        const { data: stories } = await supabase
          .from("stories")
          .select("id, title")
          .in("id", Array.from(relatedIds));
        stories?.forEach((s) => { titleMap[s.id] = s.title; });
      }

      const all = [
        ...(asSource ?? []).map((l) => ({ ...l, source_title: "this", target_title: titleMap[l.target_story_id] ?? "Unknown" })),
        ...(asTarget ?? []).map((l) => ({ ...l, source_title: titleMap[l.source_story_id] ?? "Unknown", target_title: "this" })),
      ] as StoryLink[];

      return all;
    },
  });
}

export function useCreateStoryLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: { source_story_id: string; target_story_id: string; link_type: LinkType }) => {
      const { data, error } = await supabase
        .from("story_links")
        .insert(link)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["story_links", vars.source_story_id] });
      qc.invalidateQueries({ queryKey: ["story_links", vars.target_story_id] });
    },
  });
}

export function useDeleteStoryLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("story_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["story_links"] }),
  });
}
