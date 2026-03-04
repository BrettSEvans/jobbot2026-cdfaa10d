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
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import BackgroundJobsBanner from "./components/BackgroundJobsBanner";
import AppHeader from "./components/AppHeader";
import { useAuth } from "./hooks/useAuth";
import { NavigationGuardProvider } from "./hooks/useNavigationGuard";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        {!user ? (
          <Route path="*" element={<Auth />} />
        ) : (
          <>
            <Route path="/" element={<><AppHeader onSignOut={signOut} userEmail={user.email} /><Applications /></>} />
            <Route path="/applications" element={<Navigate to="/" replace />} />
            <Route path="/applications/new" element={<><AppHeader onSignOut={signOut} userEmail={user.email} /><NewApplication /></>} />
            <Route path="/applications/:id" element={<><AppHeader onSignOut={signOut} userEmail={user.email} /><ApplicationDetail /></>} />
            <Route path="/templates" element={<><AppHeader onSignOut={signOut} userEmail={user.email} /><Templates /></>} />
            <Route path="/profile" element={<><AppHeader onSignOut={signOut} userEmail={user.email} /><Profile /></>} />
            <Route path="*" element={<NotFound />} />
          </>
        )}
      </Routes>
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
        <AuthenticatedApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
