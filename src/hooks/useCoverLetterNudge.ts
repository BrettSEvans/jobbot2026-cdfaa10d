import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "rv_cl_nudge";
const MILESTONES = [1, 3, 7];
const INACTIVITY_RESET_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface NudgeState {
  dismissed: number[];
  lastActive: string;
}

function loadState(): NudgeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { dismissed: [], lastActive: new Date().toISOString() };
}

function saveState(state: NudgeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useCoverLetterNudge() {
  const { user } = useAuth();
  const [hasMasterCL, setHasMasterCL] = useState<boolean | null>(null);
  const [appCount, setAppCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    // Check inactivity reset
    const state = loadState();
    const lastActive = new Date(state.lastActive).getTime();
    if (Date.now() - lastActive > INACTIVITY_RESET_MS) {
      saveState({ dismissed: [], lastActive: new Date().toISOString() });
    } else {
      saveState({ ...state, lastActive: new Date().toISOString() });
    }

    // Fetch profile for master_cover_letter
    supabase
      .from("profiles")
      .select("master_cover_letter")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setHasMasterCL(!!data?.master_cover_letter?.trim());
      });

    // Count applications
    supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .then(({ count }) => {
        setAppCount(count ?? 0);
      });
  }, [user]);

  const nudgeResult = useMemo(() => {
    if (hasMasterCL === null || appCount === null) return { shouldNudge: false, dismiss: () => {} };
    if (hasMasterCL) return { shouldNudge: false, dismiss: () => {} };

    const state = loadState();
    const currentMilestone = MILESTONES.find(
      (m) => appCount >= m && !state.dismissed.includes(m)
    );

    if (!currentMilestone) return { shouldNudge: false, dismiss: () => {} };

    return {
      shouldNudge: true,
      dismiss: () => {
        const updated = { ...state, dismissed: [...state.dismissed, currentMilestone] };
        saveState(updated);
      },
    };
  }, [hasMasterCL, appCount]);

  return nudgeResult;
}
