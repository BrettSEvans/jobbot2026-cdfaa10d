import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "jobbot-tutorial-state";

interface TutorialState {
  dismissed: boolean;
}

function loadState(): TutorialState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { dismissed: false };
}

function saveState(state: TutorialState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useTutorial() {
  const { user } = useAuth();
  const [state, setState] = useState<TutorialState>(loadState);
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  // Query completed application count
  useEffect(() => {
    if (!user) {
      setCompletedCount(null);
      return;
    }
    (async () => {
      try {
        const { count, error } = await supabase
          .from("job_applications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("generation_status", "complete")
          .is("deleted_at", null);
        if (!error) setCompletedCount(count ?? 0);
      } catch {
        setCompletedCount(0);
      }
    })();
  }, [user]);

  // Show tutorial banner when user has <3 completed apps and hasn't dismissed
  const showTutorial = !state.dismissed && completedCount !== null && completedCount < 3;

  // Auto-launch on first visit
  useEffect(() => {
    if (!user) return;
    const hasSeenBefore = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenBefore && completedCount !== null && completedCount === 0) {
      const timer = setTimeout(() => {
        setIsTutorialActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, completedCount]);

  const startTutorial = useCallback(() => {
    setIsTutorialActive(true);
  }, []);

  const dismissTutorial = useCallback(() => {
    setIsTutorialActive(false);
    const newState = { ...state, dismissed: true };
    setState(newState);
    saveState(newState);
  }, [state]);

  const stopTutorial = useCallback(() => {
    setIsTutorialActive(false);
  }, []);

  return {
    showTutorial,
    isTutorialActive,
    startTutorial,
    dismissTutorial,
    stopTutorial,
  };
}
