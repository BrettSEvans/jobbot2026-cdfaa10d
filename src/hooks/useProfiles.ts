import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name, avatar_url, created_at");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}
