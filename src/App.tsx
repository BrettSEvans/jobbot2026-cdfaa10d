import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Applications from "./pages/Applications";
import NewApplication from "./pages/NewApplication";
import ApplicationDetail from "./pages/ApplicationDetail";
import Templates from "./pages/Templates";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import Pricing from "./pages/Pricing";
import Landing from "./pages/Landing";
import BackgroundJobsBanner from "./components/BackgroundJobsBanner";
import AppHeader from "./components/AppHeader";
import HelpButton from "./components/HelpButton";
import TutorialOverlay from "./components/tutorial/TutorialOverlay";
import TutorialDemo from "./pages/TutorialDemo";
import { useAuth } from "./hooks/useAuth";
import { useTutorial } from "./hooks/useTutorial";
import { NavigationGuardProvider } from "./hooks/useNavigationGuard";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import "@/lib/helpEntries"; // register all help topics
import "@/lib/tutorial/steps"; // register tutorial steps

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, loading, signOut } = useAuth();
  const { isTutorialActive, tutorialMode, dismissTutorial, stopTutorial } = useTutorial();
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setApprovalStatus(null);
      setApprovalLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("approval_status")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setApprovalStatus(data?.approval_status ?? "pending");
        setApprovalLoading(false);
      });
  }, [user]);

  if (loading || (user && approvalLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Approval gate: block non-approved users
  if (user && approvalStatus && approvalStatus !== "approved") {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<PendingApproval status={approvalStatus as "pending" | "rejected"} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <NavigationGuardProvider>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          {!user ? (
            <>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Landing />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><Applications /></main></>} />
              <Route path="/applications" element={<Navigate to="/" replace />} />
              <Route path="/applications/new" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><NewApplication /></main></>} />
              <Route path="/applications/:id" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><ApplicationDetail /></main></>} />
              <Route path="/templates" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><Templates /></main></>} />
              <Route path="/profile" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><Profile /></main></>} />
              <Route path="/admin" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><Admin /></main></>} />
              <Route path="/pricing" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><Pricing /></main></>} />
              <Route path="/tutorial-demo" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><TutorialDemo /></main></>} />
              <Route path="*" element={<NotFound />} />
            </>
          )}
        </Routes>
      </NavigationGuardProvider>
      {user && <HelpButton />}
      {user && isTutorialActive && <TutorialOverlay onDismiss={dismissTutorial} tutorialMode={tutorialMode} />}
      <BackgroundJobsBanner />
    </BrowserRouter>
  );
}

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ImpersonationProvider>
            <AuthenticatedApp />
          </ImpersonationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
