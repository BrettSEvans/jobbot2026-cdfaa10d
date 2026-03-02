import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getContextLabel(pathname: string): string {
  if (pathname === "/" || pathname === "/applications") return "Applications list";
  if (pathname === "/applications/new") return "new application form";
  if (pathname.startsWith("/applications/")) return "application dashboard";
  if (pathname === "/templates") return "templates library";
  return "this page";
}

function pickResponse(pathname: string, userMsg: string): string {
  const q = userMsg.toLowerCase();
  const ctx = getContextLabel(pathname);

  // Keyword-aware mock responses
  if (q.includes("competitor") || q.includes("market")) {
    return `Great question about competitors! On your ${ctx}, I'd normally pull market intelligence from the analysis we ran. Key areas to explore: market share trends, pricing comparisons, and product differentiation. Want me to dig into any of those?`;
  }
  if (q.includes("chart") || q.includes("graph") || q.includes("visual")) {
    return `For the ${ctx}, I can help adjust chart types — bar charts work well for comparisons, line charts for trends over time, and doughnut charts for composition breakdowns. What data would you like to visualize differently?`;
  }
  if (q.includes("cover letter") || q.includes("letter")) {
    return `Looking at your ${ctx} — I can help refine the cover letter's tone, emphasize specific qualifications, or restructure it for a different format (e.g., more concise for email, or more detailed for formal applications). What would you like to adjust?`;
  }
  if (q.includes("color") || q.includes("brand") || q.includes("theme") || q.includes("design")) {
    return `On the ${ctx}, I can help adjust the branding — colors, fonts, and layout. The dashboard uses the company's brand colors by default. Would you like to change the primary palette, adjust contrast, or try a different font pairing?`;
  }
  if (q.includes("export") || q.includes("download") || q.includes("share")) {
    return `From your ${ctx}, you can download the dashboard as a ZIP (with separate HTML, CSS, and JS files) or as a single HTML file. You can also copy the HTML to clipboard. Would you like help with any of these?`;
  }
  if (q.includes("interview") || q.includes("prepare")) {
    return `Based on the ${ctx}, here are some preparation tips: Research the company's recent initiatives, prepare STAR-format answers for behavioral questions, and have specific metrics ready from your past work. Want me to generate practice questions for this role?`;
  }

  // Fallback context-aware responses
  const fallbacks: Record<string, string[]> = {
    applications: [
      "I can see your applications list. Want me to help compare companies, prioritize roles, or suggest which applications need attention?",
      "Looking at your applications — I can help summarize progress, identify stalled applications, or draft follow-up messages.",
    ],
    new: [
      "You're starting a new application! Paste the job URL and I'll extract key requirements, identify the company's priorities, and tailor your materials automatically.",
      "I can help you research the company while you fill this out — just ask about their products, culture, or competitors!",
    ],
    detail: [
      "I'm looking at this dashboard. I can help refine any section — adjust charts, update metrics, modify the cover letter, or add new data visualizations. What needs work?",
      "Want me to highlight key qualifications for this role, suggest talking points for the interview, or refine the dashboard's layout?",
    ],
    templates: [
      "You're in the templates library. I can help you create a new template from scratch or suggest which existing one best fits a particular role or department.",
      "Templates speed up applications significantly. Want tips on making them more versatile across different companies?",
    ],
    default: [
      "I'm your AI assistant — I can help with job applications, cover letters, company research, dashboard customization, and interview prep. What do you need?",
    ],
  };

  let pool: string[];
  if (pathname === "/" || pathname === "/applications") pool = fallbacks.applications;
  else if (pathname === "/applications/new") pool = fallbacks.new;
  else if (pathname.startsWith("/applications/")) pool = fallbacks.detail;
  else if (pathname === "/templates") pool = fallbacks.templates;
  else pool = fallbacks.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiChat({ isOpen, onClose }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { pathname } = useLocation();

  // auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsThinking(true);
    const currentPath = pathname;
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: pickResponse(currentPath, text) },
      ]);
      setIsThinking(false);
    }, 1500);
  }, [input, isThinking, pathname]);

  return (
    <div
      className={cn(
        "fixed top-12 right-4 z-50 flex flex-col w-[380px] max-h-[min(520px,calc(100vh-4rem))] rounded-2xl border bg-card text-card-foreground shadow-2xl transition-all duration-200 origin-top-right",
        isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">AI Assistant</span>
          <span className="text-xs text-muted-foreground">· {getContextLabel(pathname)}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="flex flex-col gap-3 p-4">
          {messages.length === 0 && !isThinking && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ask me anything about your {getContextLabel(pathname)}.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-muted text-foreground"
              )}
            >
              {m.content}
            </div>
          ))}
          {isThinking && (
            <div className="self-start bg-muted rounded-xl px-4 py-2 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question…"
          className="flex-1 h-9 text-sm"
          disabled={isThinking}
        />
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={!input.trim() || isThinking}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
