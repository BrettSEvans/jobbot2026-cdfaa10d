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
  /** Update the active persona in-place (e.g. after saving test user fields) */
  updateActivePersona: (updates: Partial<PersonaProfile>) => void;
  loading: boolean;
}

const ImpersonationContext = createContext<ImpersonationState | null>(null);

// ── Module-level store for non-React code (e.g. backgroundGenerator) ──
let _activePersona: PersonaProfile | null = null;

/** Get the current active persona from outside React (module-level) */
export function getActivePersonaSnapshot(): PersonaProfile | null {
  return _activePersona;
}

// ── Session persistence helpers ──
const SESSION_KEY = "jobbot_active_persona";

function persistPersona(persona: PersonaProfile | null) {
  if (persona?.isTestUser) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(persona));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function restorePersona(): PersonaProfile | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersonaProfile;
    return parsed?.isTestUser ? parsed : null;
  } catch {
    return null;
  }
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [rootProfile, setRootProfile] = useState<PersonaProfile | null>(null);
  const [activePersona, setActivePersona] = useState<PersonaProfile | null>(() => restorePersona());
  const [loading, setLoading] = useState(true);

  // Keep module-level ref + sessionStorage in sync
  useEffect(() => {
    _activePersona = activePersona;
    persistPersona(activePersona);
  }, [activePersona]);

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
        first_name: data.first_name ?? null,
        middle_name: data.middle_name ?? null,
        last_name: data.last_name ?? null,
        display_name: data.display_name,
        resume_text: data.resume_text ?? null,
        years_experience: data.years_experience ?? null,
        preferred_tone: data.preferred_tone ?? "professional",
        key_skills: data.key_skills ?? [],
        target_industries: data.target_industries ?? [],
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

  const updateActivePersona = useCallback((updates: Partial<PersonaProfile>) => {
    setActivePersona((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

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
        updateActivePersona,
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
