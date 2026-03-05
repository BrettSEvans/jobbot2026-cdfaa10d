import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/** Count how many applications the user created this calendar month */
export function useAppUsage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["app-usage-month", user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .gte("created_at", startOfMonth.toISOString());

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });
}
