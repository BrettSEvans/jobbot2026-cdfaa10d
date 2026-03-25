import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        wasAuthenticated.current = true;
      }

      // If the user was previously authenticated and the session dropped
      // (e.g. token expired during a long pipeline), try to refresh before logging out
      if (!session && wasAuthenticated.current && event === "SIGNED_OUT" && !intentionalSignOut.current) {
        // Attempt a silent refresh — if the refresh token is still valid this will restore the session
        const { data } = await supabase.auth.refreshSession();
        if (data.session) {
          // Refresh succeeded — don't log the user out
          return;
        }
        // Refresh truly failed — allow the logout to proceed
        wasAuthenticated.current = false;
      }
      intentionalSignOut.current = false;

      setSession(session);
      setUser(session?.user ?? null);
      if (initialized.current) setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        wasAuthenticated.current = true;
        // Track last sign-in
        supabase.from("profiles").update({ last_sign_in_at: new Date().toISOString() }).eq("id", session.user.id).then(() => {});
      }
      initialized.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const intentionalSignOut = useRef(false);

  const signOut = useCallback(async () => {
    intentionalSignOut.current = true;
    wasAuthenticated.current = false;
    await supabase.auth.signOut();
  }, []);

  return { user, session, loading, signOut };
}
