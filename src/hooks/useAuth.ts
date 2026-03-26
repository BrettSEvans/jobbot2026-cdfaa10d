import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import React from "react";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const intentionalSignOut = useRef(false);

  useEffect(() => {
    // Single auth listener for the entire app
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // If we intentionally signed out, never attempt recovery
      if (intentionalSignOut.current) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (initialized.current) setLoading(false);
    });

    // Bootstrap: get existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        // Track last sign-in (fire and forget)
        supabase
          .from("profiles")
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq("id", existingSession.user.id)
          .then(() => {});
      }
      initialized.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    // Mark intentional so the listener above never recovers
    intentionalSignOut.current = true;
    // Immediately clear state for responsive UI
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
    // Reset flag after sign-out completes so a fresh login works
    intentionalSignOut.current = false;
  }, []);

  return React.createElement(
    AuthContext.Provider,
    { value: { user, session, loading, signOut } },
    children
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
