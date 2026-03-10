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
import VerifyEmail from "./pages/VerifyEmail";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CookiePolicy from "./pages/CookiePolicy";
import CookieConsentBanner from "./components/CookieConsentBanner";
import BackgroundJobsBanner from "./components/BackgroundJobsBanner";
import AppHeader from "./components/AppHeader";
import HelpButton from "./components/HelpButton";
import TutorialOverlay from "./components/tutorial/TutorialOverlay";
import TutorialDemo from "./pages/TutorialDemo";
import ImportJob from "./pages/ImportJob";

import { useAuth } from "./hooks/useAuth";
import { useTutorial } from "./hooks/useTutorial";
import { useIdleTimeout } from "./hooks/useIdleTimeout";
import { NavigationGuardProvider } from "./hooks/useNavigationGuard";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/branding";
import { initAnalytics, analytics } from "@/lib/analytics";
import { captureAttribution, getStoredAttribution, clearAttribution } from "@/lib/marketingAttribution";
import "@/lib/helpEntries"; // register all help topics
import "@/lib/qaEntries"; // register all QA test cases
import "@/lib/tutorial/steps"; // register tutorial steps

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, loading, signOut } = useAuth();
  const { isTutorialActive, tutorialMode, dismissTutorial, stopTutorial } = useTutorial();
  useIdleTimeout(!!user);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setApprovalStatus(null);
      setApprovalLoading(false);
      analytics.reset();
      return;
    }
    // Identify user in analytics
    const attribution = getStoredAttribution();
    analytics.identify(user.id, { email: user.email, ...(attribution ?? {}) });

    supabase
      .from("profiles")
      .select("approval_status, referral_source")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setApprovalStatus(data?.approval_status ?? "pending");
        setApprovalLoading(false);

        // Persist attribution to profile if not already stored
        if (attribution && !data?.referral_source) {
          supabase
            .from("profiles")
            .update({ referral_source: attribution as any })
            .eq("id", user.id)
            .then(() => {
              clearAttribution();
              // Auto-approve campaign users
              const utmCampaign = (attribution as Record<string, string>).utm_campaign;
              if (utmCampaign && data?.approval_status === "pending") {
                supabase
                  .rpc("campaign_auto_approve", { _user_id: user.id, _utm_campaign: utmCampaign })
                  .then(({ data: approved }) => {
                    if (approved) {
                      setApprovalStatus("approved");
                    }
                  });
              }
            });
        }
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
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/pricing" element={<Landing />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><Applications /></main></>} />
              <Route path="/applications" element={<Navigate to="/" replace />} />
              <Route path="/auth" element={<Navigate to="/" replace />} />
              <Route path="/applications/new" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><NewApplication /></main></>} />
              <Route path="/applications/:id" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><ApplicationDetail /></main></>} />
              <Route path="/templates" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><Templates /></main></>} />
              <Route path="/profile" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><Profile /></main></>} />
              <Route path="/admin" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><Admin /></main></>} />
              <Route path="/pricing" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><Pricing /></main></>} />
              <Route path="/tutorial-demo" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><TutorialDemo /></main></>} />
              <Route path="/import" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><ImportJob /></main></>} />
              
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="*" element={<NotFound />} />
            </>
          )}
        </Routes>
      </NavigationGuardProvider>
      {user && <HelpButton />}
      {user && isTutorialActive && <TutorialOverlay onDismiss={dismissTutorial} tutorialMode={tutorialMode} />}
      <BackgroundJobsBanner />
      <CookieConsentBanner />
    </BrowserRouter>
  );
}

const App = () => {
  useEffect(() => {
    document.title = `${BRAND.name} — ${BRAND.tagline}`;
    initAnalytics(import.meta.env.VITE_POSTHOG_KEY);
    captureAttribution(); // Capture UTM/ref params before auth redirect
  }, []);

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
