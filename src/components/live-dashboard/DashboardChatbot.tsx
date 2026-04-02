import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DashboardChatbotProps {
  dashboardId: string;
  companyName: string;
  jobTitle: string;
}

export default function DashboardChatbot({ dashboardId, companyName, jobTitle }: DashboardChatbotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
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
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        title="Ask about this dashboard"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[360px] h-[480px] flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div>
          <p className="text-sm font-semibold">Dashboard Assistant</p>
          <p className="text-xs text-muted-foreground">{companyName} — {jobTitle}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-8">
            Ask me anything about this dashboard's data and metrics.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}>
              {m.content}
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
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
