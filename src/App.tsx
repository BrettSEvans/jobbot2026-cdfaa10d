import { useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Applications from "./pages/Applications";
import NewApplication from "./pages/NewApplication";
import ApplicationDetail from "./pages/ApplicationDetail";
import Templates from "./pages/Templates";
import StoryBoard from "./pages/StoryBoard";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import LiveDashboard from "./pages/LiveDashboard";
import BackgroundJobsBanner from "./components/BackgroundJobsBanner";
import AppHeader from "./components/AppHeader";
import AiChat from "./components/AiChat";
import { HelpDrawer } from "./components/HelpDrawer";
import { TutorialTour, useTourState } from "./components/TutorialTour";
import { Skeleton } from "@/components/ui/skeleton";

const queryClient = new QueryClient();

function useProfileCheck(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile_check", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("id", userId!)
        .single();
      return data;
    },
  });
}

function AuthenticatedApp() {
  const { user, loading, signOut } = useAuth();
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const { data: profile, isLoading: profileLoading } = useProfileCheck(user?.id);
  const tour = useTourState();

  useInactivityLogout();

  if (loading || (user && profileLoading)) {
    return <div className="flex items-center justify-center h-screen"><Skeleton className="w-64 h-8" /></div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!profile?.onboarding_completed_at) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <BackgroundJobsBanner />
      <AppHeader aiChatOpen={aiChatOpen} onAiChatToggle={() => setAiChatOpen((o) => !o)} />
      <AiChat isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      <HelpDrawer />
      <TutorialTour active={tour.active} onComplete={tour.complete} />
      <Routes>
        <Route path="/" element={<Applications />} />
        <Route path="/applications" element={<Navigate to="/" replace />} />
        <Route path="/applications/new" element={<NewApplication />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/stories" element={<StoryBoard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function AppRoutes() {
  const location = useLocation();
  // Public dashboard routes don't need auth
  if (location.pathname.startsWith("/d/")) {
    return (
      <Routes>
        <Route path="/d/:username/:company/:jobtitle" element={<LiveDashboard />} />
      </Routes>
    );
  }
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
