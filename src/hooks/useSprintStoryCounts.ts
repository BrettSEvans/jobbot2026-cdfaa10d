import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSprintStoryCounts() {
  return useQuery({
    queryKey: ["sprint_story_counts"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sprint_story_counts");
      if (error) throw error;
      const storyCounts: Record<string, number> = {};
      const doneCounts: Record<string, number> = {};
      (data ?? []).forEach((row: any) => {
        storyCounts[row.sprint_id] = Number(row.total);
        doneCounts[row.sprint_id] = Number(row.done);
      });
      return { storyCounts, doneCounts };
    },
  });
}
