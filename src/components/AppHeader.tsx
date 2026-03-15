import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";
import { useTheme } from "@/hooks/useTheme";

interface AppHeaderProps {
  onAiChatToggle: () => void;
  aiChatOpen: boolean;
}

export default function AppHeader({ onAiChatToggle, aiChatOpen }: AppHeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const links = [
    { to: "/", label: "Applications", match: (p: string) => p === "/" || p === "/applications" },
    { to: "/templates", label: "Templates", match: (p: string) => p === "/templates" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 md:px-8">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="focus:outline-none">
            <BrandLogo iconSize="2.2em" />
          </button>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <button
                key={l.to}
                onClick={() => navigate(l.to)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors font-body",
                  l.match(pathname)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                )}
              >
                {l.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: theme toggle + AI Chat */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant={aiChatOpen ? "default" : "outline"}
            size="sm"
            onClick={onAiChatToggle}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Chat</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
