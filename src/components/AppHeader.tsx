import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Sun, Moon, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AppHeaderProps {
  onAiChatToggle: () => void;
  aiChatOpen: boolean;
}

function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is_admin", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="h-9 w-9">
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}

export default function AppHeader({ onAiChatToggle, aiChatOpen }: AppHeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  const links = [
    { to: "/", label: "Applications", match: (p: string) => p === "/" || p === "/applications" },
    { to: "/templates", label: "Templates", match: (p: string) => p === "/templates" },
    { to: "/stories", label: "Stories", match: (p: string) => p === "/stories" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", match: (p: string) => p === "/admin" }] : []),
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
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10",
                  l.to === "/admin" && "gap-1 flex items-center"
                )}
              >
                {l.to === "/admin" && <Shield className="h-3.5 w-3.5" />}
                {l.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: theme toggle + AI Chat + Sign Out */}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            aria-label="Sign out"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
