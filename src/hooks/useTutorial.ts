import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { BRAND } from "@/lib/branding";

const STORAGE_KEY = `${BRAND.storagePrefix}-tutorial-state`;
const TUTORIAL_EVENT = `${BRAND.storagePrefix}-tutorial-toggle`;

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

  // Listen for cross-instance toggle events
  useEffect(() => {
    const handler = (e: Event) => {
      const active = (e as CustomEvent).detail as boolean;
      setIsTutorialActive(active);
    };
    window.addEventListener(TUTORIAL_EVENT, handler);
    return () => window.removeEventListener(TUTORIAL_EVENT, handler);
  }, []);

  const [totalAppCount, setTotalAppCount] = useState<number | null>(null);

  // Query completed application count + total app count
  useEffect(() => {
    if (!user) {
      setCompletedCount(null);
      setTotalAppCount(null);
      return;
    }
    (async () => {
      try {
        const [completedRes, totalRes] = await Promise.all([
          supabase
            .from("job_applications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("generation_status", "complete")
            .is("deleted_at", null),
          supabase
            .from("job_applications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("deleted_at", null),
        ]);
        if (!completedRes.error) setCompletedCount(completedRes.count ?? 0);
        if (!totalRes.error) setTotalAppCount(totalRes.count ?? 0);
      } catch {
        setCompletedCount(0);
        setTotalAppCount(0);
      }
    })();
  }, [user]);

  const showTutorial = !state.dismissed && completedCount !== null && completedCount < 3;

  // Auto-launch on first visit
  useEffect(() => {
    if (!user) return;
    const hasSeenBefore = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenBefore && completedCount !== null && completedCount === 0) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent(TUTORIAL_EVENT, { detail: true }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, completedCount]);

  const startTutorial = useCallback(() => {
    window.dispatchEvent(new CustomEvent(TUTORIAL_EVENT, { detail: true }));
  }, []);

  const dismissTutorial = useCallback(() => {
    window.dispatchEvent(new CustomEvent(TUTORIAL_EVENT, { detail: false }));
    const newState = { dismissed: true };
    setState(newState);
    saveState(newState);
  }, []);

  const stopTutorial = useCallback(() => {
    window.dispatchEvent(new CustomEvent(TUTORIAL_EVENT, { detail: false }));
  }, []);

  const tutorialMode: "live" | "demo" = (totalAppCount !== null && totalAppCount > 0) ? "live" : "demo";

  return {
    showTutorial,
    isTutorialActive,
    tutorialMode,
    startTutorial,
    dismissTutorial,
    stopTutorial,
  };
}
