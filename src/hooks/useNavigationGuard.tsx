import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavigationGuardContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (v: boolean) => void;
  setDirtySections: (sections: string[]) => void;
  guardedNavigate: (fn: () => void) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextType>({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
  setDirtySections: () => {},
  guardedNavigate: (fn) => fn(),
});

export function NavigationGuardProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dirtySections, setDirtySections] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);

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
      if (!hasUnsavedChanges) {
        fn();
      } else {
        pendingNavRef.current = fn;
        setDialogOpen(true);
      }
    },
    [hasUnsavedChanges]
  );

  const handleConfirmLeave = useCallback(() => {
    setDialogOpen(false);
    if (pendingNavRef.current) {
      const fn = pendingNavRef.current;
      pendingNavRef.current = null;
      // Reset state before navigating so the guard doesn't re-trigger
      setHasUnsavedChanges(false);
      setDirtySections([]);
      fn();
    }
  }, []);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    pendingNavRef.current = null;
  }, []);

  const value = useMemo(
    () => ({ hasUnsavedChanges, setHasUnsavedChanges, setDirtySections, guardedNavigate }),
    [hasUnsavedChanges, guardedNavigate]
  );

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>You have unsaved changes in the following sections:</p>
                <ul className="list-disc list-inside space-y-1">
                  {dirtySections.map((section) => (
                    <li key={section} className="font-medium text-foreground">{section}</li>
                  ))}
                </ul>
                <p>Are you sure you want to leave without saving?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCancel} className="bg-primary text-primary-foreground hover:bg-primary/90">Stay on Page</AlertDialogAction>
            <AlertDialogCancel onClick={handleConfirmLeave} className="border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground">
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  return useContext(NavigationGuardContext);
}
