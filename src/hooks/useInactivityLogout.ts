import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
const WARNING_MS = 7 * 60 * 60 * 1000 + 55 * 60 * 1000; // 7 hours 55 minutes

export function useInactivityLogout() {
  const { signOut } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShown = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    warningShown.current = false;

    warningRef.current = setTimeout(() => {
      warningShown.current = true;
      toast.warning("Session expiring soon — interact to stay signed in", {
        duration: 10000,
      });
    }, WARNING_MS);

    timerRef.current = setTimeout(async () => {
      toast.info("Signed out due to inactivity");
      await signOut();
    }, TIMEOUT_MS);
  }, [clearTimers, signOut]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"];
    const handler = () => resetTimers();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      clearTimers();
    };
  }, [resetTimers, clearTimers]);
}
