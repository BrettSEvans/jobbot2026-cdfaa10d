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
import BackgroundJobsBanner from "./components/BackgroundJobsBanner";
import AppHeader from "./components/AppHeader";
import HelpButton from "./components/HelpButton";
import { useAuth } from "./hooks/useAuth";
import { NavigationGuardProvider } from "./hooks/useNavigationGuard";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import "@/lib/helpEntries"; // register all help topics

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, loading, signOut } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setApprovalStatus(null);
      setApprovalLoading(false);
      return;
    }
    (supabase as any)
      .from("profiles")
      .select("approval_status")
      .eq("id", user.id)
      .single()
      .then(({ data, error }: any) => {
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
            <Route path="*" element={<Auth />} />
          ) : (
            <>
              <Route path="/" element={<><AppHeader onSignOut={signOut} /><Applications /></>} />
              <Route path="/applications" element={<Navigate to="/" replace />} />
              <Route path="/applications/new" element={<><AppHeader onSignOut={signOut} /><NewApplication /></>} />
              <Route path="/applications/:id" element={<><AppHeader onSignOut={signOut} /><ApplicationDetail /></>} />
              <Route path="/templates" element={<><AppHeader onSignOut={signOut} /><Templates /></>} />
              <Route path="/profile" element={<><AppHeader onSignOut={signOut} /><Profile /></>} />
              <Route path="/admin" element={<><AppHeader onSignOut={signOut} /><Admin /></>} />
              <Route path="*" element={<NotFound />} />
            </>
          )}
        </Routes>
      </NavigationGuardProvider>
      {user && <HelpButton />}
    </BrowserRouter>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BackgroundJobsBanner />
        <ImpersonationProvider>
          <AuthenticatedApp />
        </ImpersonationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
