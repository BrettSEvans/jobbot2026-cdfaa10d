import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

interface NavigationGuardContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (v: boolean) => void;
  /** Wraps a navigate call: shows confirm if dirty, calls fn if confirmed */
  guardedNavigate: (fn: () => void) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextType>({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
  guardedNavigate: (fn) => fn(),
});

export function NavigationGuardProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Browser tab close / refresh guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const guardedNavigate = useCallback(
    (fn: () => void) => {
      if (!hasUnsavedChanges || window.confirm("You have unsaved profile changes. Leave without saving?")) {
        fn();
      }
    },
    [hasUnsavedChanges]
  );

  const value = useMemo(
    () => ({ hasUnsavedChanges, setHasUnsavedChanges, guardedNavigate }),
    [hasUnsavedChanges, guardedNavigate]
  );

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  return useContext(NavigationGuardContext);
}
