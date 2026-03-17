import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Applications from "./pages/Applications";
import NewApplication from "./pages/NewApplication";
import ApplicationDetail from "./pages/ApplicationDetail";
import Templates from "./pages/Templates";
import StoryBoard from "./pages/StoryBoard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import BackgroundJobsBanner from "./components/BackgroundJobsBanner";
import AppHeader from "./components/AppHeader";
import AiChat from "./components/AiChat";
import { Skeleton } from "@/components/ui/skeleton";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [aiChatOpen, setAiChatOpen] = useState(false);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Skeleton className="w-64 h-8" /></div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <BackgroundJobsBanner />
      <AppHeader aiChatOpen={aiChatOpen} onAiChatToggle={() => setAiChatOpen((o) => !o)} />
      <AiChat isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      <Routes>
        <Route path="/" element={<Applications />} />
        <Route path="/applications" element={<Navigate to="/" replace />} />
        <Route path="/applications/new" element={<NewApplication />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/stories" element={<StoryBoard />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthenticatedApp />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
