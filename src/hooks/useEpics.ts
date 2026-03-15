import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Epic {
  id: string;
  sprint_id: string;
  name: string;
  description: string | null;
  epic_order: number;
  color: string | null;
}

export function useEpics(sprintId?: string | null) {
  return useQuery({
    queryKey: ["epics", sprintId ?? "all"],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase.from("epics").select("*").order("epic_order");
      if (sprintId) q = q.eq("sprint_id", sprintId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Epic[];
    },
  });
}
