import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";
import type { DashboardData } from "@/lib/dashboard/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DashboardChatbotProps {
  dashboardId: string;
  companyName: string;
  jobTitle: string;
  dashboardData?: DashboardData;
}

export default function DashboardChatbot({ dashboardId, companyName, jobTitle, dashboardData }: DashboardChatbotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Generate suggested questions from dashboard data
  const suggestions = useMemo(() => {
    if (!dashboardData) return [];
    const chips: string[] = [];
    const sections = dashboardData.sections || [];
    if (sections.length > 0) {
      chips.push(`Summarize the ${sections[0].title} section`);
    }
    const hasMetrics = sections.some((s) => s.metrics?.length);
    if (hasMetrics) chips.push("What are the top KPIs?");
    if (dashboardData.cfoScenarios?.length) chips.push("Explain the scenario analysis");
    if (dashboardData.agenticWorkforce?.length) chips.push("What AI agents are proposed?");
    if (chips.length < 3) chips.push("What insights can you share?");
    return chips.slice(0, 4);
  }, [dashboardData]);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("dashboard-chat", {
        body: { dashboardId, question: q, history: messages.slice(-6) },
      });
      if (error) throw error;
      setMessages((prev) => [...prev, { role: "assistant", content: data?.answer || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "An error occurred. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-colors"
        style={{ background: "var(--dash-primary, hsl(var(--primary)))", color: "var(--dash-on-primary, hsl(var(--primary-foreground)))" }}
        title="Ask about this dashboard"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    );
  }

  const panelClasses = isMobile
    ? "fixed inset-0 z-50 flex flex-col"
    : "fixed bottom-6 right-6 z-50 w-[360px] h-[480px] flex flex-col shadow-xl";

  return (
    <div
      className={`${isMobile ? "fixed inset-0 z-50 flex flex-col" : "fixed bottom-6 right-6 z-50 w-[360px] h-[480px] flex flex-col"} rounded-[32px] overflow-hidden`}
      style={{
        background: "var(--dash-surface, #E0E5EC)",
        boxShadow: "12px 12px 20px rgb(163,177,198,0.7), -12px -12px 20px rgba(255,255,255,0.6)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3" style={{ background: "var(--dash-primary, #0a8080)", color: "var(--dash-on-primary, #fff)" }}>
        <div>
          <p className="text-sm font-bold" style={{ fontFamily: "var(--dash-font-heading, 'Plus Jakarta Sans', sans-serif)" }}>Dashboard Assistant</p>
          <p className="text-xs opacity-80">{companyName} — {jobTitle}</p>
        </div>
        <button className="h-7 w-7 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all duration-300" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center mt-6 space-y-4">
            <p className="text-xs text-muted-foreground">
              Ask me anything about this dashboard's data and metrics.
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-2xl transition-all duration-300 hover:-translate-y-px text-left"
                    style={{
                      background: "var(--dash-surface, #E0E5EC)",
                      color: "var(--dash-on-surface, #3D4852)",
                      boxShadow: "5px 5px 10px rgb(163,177,198,0.6), -5px -5px 10px rgba(255,255,255,0.5)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-sm [&>h2]:text-sm [&>h3]:text-sm">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="min-h-[36px] max-h-[72px] resize-none text-sm"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => send()} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
