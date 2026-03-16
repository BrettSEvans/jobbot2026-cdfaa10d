import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Sprint {
  id: string;
  name: string;
  description: string | null;
  sprint_order: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

export function useSprints() {
  return useQuery({
    queryKey: ["sprints"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sprints")
        .select("*")
        .order("sprint_order");
      if (error) throw error;
      return data as Sprint[];
    },
  });
}

export function useUpdateSprintStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("sprints")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
    },
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sprint: { name: string; description?: string; sprint_order?: number; status?: string; start_date?: string; end_date?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("sprints")
        .insert({ ...sprint, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Sprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
    },
  });
}
