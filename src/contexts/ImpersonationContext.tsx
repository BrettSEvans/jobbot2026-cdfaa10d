import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Shape shared by both real profiles and test-user personas */
export interface PersonaProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  display_name: string | null;
  resume_text: string | null;
  years_experience: string | null;
  preferred_tone: string;
  key_skills: string[];
  target_industries: string[];
  /** If this persona comes from the test_users table */
  isTestUser: boolean;
}

interface ImpersonationState {
  /** The real logged-in admin profile (null while loading) */
  rootProfile: PersonaProfile | null;
  /** The currently active persona – defaults to rootProfile */
  activePersona: PersonaProfile | null;
  /** True when activePersona !== rootProfile */
  isImpersonating: boolean;
  /** Switch to a test user persona */
  switchToTestUser: (testUser: PersonaProfile) => void;
  /** Return to the admin's own profile */
  switchToSelf: () => void;
  /** Refresh root profile from DB */
  refreshRoot: () => Promise<void>;
  loading: boolean;
}

const ImpersonationContext = createContext<ImpersonationState | null>(null);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [rootProfile, setRootProfile] = useState<PersonaProfile | null>(null);
  const [activePersona, setActivePersona] = useState<PersonaProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRoot = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRootProfile(null);
        setActivePersona(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const persona: PersonaProfile = {
        id: data.id,
        first_name: (data as any).first_name ?? null,
        middle_name: (data as any).middle_name ?? null,
        last_name: (data as any).last_name ?? null,
        display_name: data.display_name,
        resume_text: (data as any).resume_text ?? null,
        years_experience: (data as any).years_experience ?? null,
        preferred_tone: (data as any).preferred_tone ?? "professional",
        key_skills: (data as any).key_skills ?? [],
        target_industries: (data as any).target_industries ?? [],
        isTestUser: false,
      };

      setRootProfile(persona);
      // Only set active if not already impersonating
      setActivePersona((prev) => (prev?.isTestUser ? prev : persona));
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  const switchToTestUser = useCallback((testUser: PersonaProfile) => {
    setActivePersona({ ...testUser, isTestUser: true });
  }, []);

  const switchToSelf = useCallback(() => {
    setActivePersona(rootProfile);
  }, [rootProfile]);

  const isImpersonating = !!(activePersona?.isTestUser);

  return (
    <ImpersonationContext.Provider
      value={{
        rootProfile,
        activePersona,
        isImpersonating,
        switchToTestUser,
        switchToSelf,
        refreshRoot: loadRoot,
        loading,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error("useImpersonation must be used inside ImpersonationProvider");
  return ctx;
}
