import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

const IDLE_LIMIT_MS = 30 * 60 * 1000;     // 30 minutes
const WARNING_AT_MS = 25 * 60 * 1000;     // warn at 25 minutes
const EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export function useIdleTimeout(enabled: boolean) {
  const { toast } = useToast();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warned = useRef(false);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }, []);

  const resetTimers = useCallback(() => {
    warned.current = false;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);

    warnTimer.current = setTimeout(() => {
      if (!warned.current) {
        warned.current = true;
        toast({
          title: "Session expiring soon",
          description: "You'll be logged out in 5 minutes due to inactivity.",
        });
      }
    }, WARNING_AT_MS);

    idleTimer.current = setTimeout(logout, IDLE_LIMIT_MS);
  }, [toast, logout]);

  useEffect(() => {
    if (!enabled) return;

    resetTimers();

    const handler = () => resetTimers();
    for (const evt of EVENTS) {
      window.addEventListener(evt, handler, { passive: true });
    }

    return () => {
      for (const evt of EVENTS) {
        window.removeEventListener(evt, handler);
      }
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
    };
  }, [enabled, resetTimers]);
}
