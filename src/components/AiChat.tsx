import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquare, X, Send, Sparkles } from "lucide-react";
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

const responses: Record<string, string[]> = {
  applications: [
    "I can see your applications list. Want me to help you compare companies or prioritize which roles to focus on?",
    "Looking at your applications — I can help summarize status across all your active jobs or draft outreach messages.",
    "Need help filtering or sorting your applications? I can also suggest next steps for any stalled ones.",
  ],
  new: [
    "You're starting a new application — paste the job URL and I'll help extract key requirements and tailor your materials.",
    "I can help you research the company while you fill this out. Just ask!",
  ],
  detail: [
    "I'm looking at this application's dashboard. I can help refine the cover letter, suggest talking points, or analyze the company further.",
    "Want me to highlight the most important qualifications for this role, or help you prepare interview questions?",
  ],
  templates: [
    "You're in the templates library. I can help you create a new template or suggest which one fits a particular role best.",
    "Templates are great for speeding up applications. Want tips on making them more versatile?",
  ],
  default: [
    "I'm your AI assistant — I can help with job applications, cover letters, company research, and interview prep. What do you need?",
  ],
};

function pickResponse(pathname: string, input: string): string {
  let pool: string[];
  if (pathname === "/" || pathname === "/applications") pool = responses.applications;
  else if (pathname === "/applications/new") pool = responses.new;
  else if (pathname.startsWith("/applications/")) pool = responses.detail;
  else if (pathname === "/templates") pool = responses.templates;
  else pool = responses.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
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
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsThinking(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: pickResponse(pathname, text) },
      ]);
      setIsThinking(false);
    }, 1500);
  }, [input, isThinking, pathname]);

  return (
    <>
      {/* Floating trigger */}
      <Button
        onClick={() => setIsOpen((o) => !o)}
        size="icon"
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105",
          isOpen && "scale-0 pointer-events-none"
        )}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 flex flex-col w-[380px] max-h-[520px] rounded-2xl border bg-card text-card-foreground shadow-2xl transition-all duration-200 origin-bottom-right",
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
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
    </>
  );
}
