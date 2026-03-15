import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Applications from "./pages/Applications";
import NewApplication from "./pages/NewApplication";
import ApplicationDetail from "./pages/ApplicationDetail";
import Templates from "./pages/Templates";
import StoryBoard from "./pages/StoryBoard";
import NotFound from "./pages/NotFound";
import BackgroundJobsBanner from "./components/BackgroundJobsBanner";
import AppHeader from "./components/AppHeader";
import AiChat from "./components/AiChat";

const queryClient = new QueryClient();

const App = () => {
  const [aiChatOpen, setAiChatOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BackgroundJobsBanner />
        <BrowserRouter>
          <AppHeader
            aiChatOpen={aiChatOpen}
            onAiChatToggle={() => setAiChatOpen((o) => !o)}
          />
          <AiChat isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
          <Routes>
            <Route path="/" element={<Applications />} />
            <Route path="/applications" element={<Navigate to="/" replace />} />
            <Route path="/applications/new" element={<NewApplication />} />
            <Route path="/applications/:id" element={<ApplicationDetail />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/stories" element={<StoryBoard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
