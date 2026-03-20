import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Sparkles, Sun, Moon, Shield, LogOut, Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  const { signOut, user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Story 2.3: Only show Stories link to admins
  const links = [
    { to: "/", label: "Applications", icon: null, match: (p: string) => p === "/" || p === "/applications", tourId: "applications" },
    { to: "/templates", label: "Templates", icon: null, match: (p: string) => p === "/templates", tourId: "templates" },
    { to: "/profile", label: "Profile", icon: <User className="h-3.5 w-3.5" />, match: (p: string) => p === "/profile", tourId: "profile" },
    ...(isAdmin ? [
      { to: "/stories", label: "Stories", icon: null, match: (p: string) => p === "/stories", tourId: undefined },
      { to: "/admin", label: "Admin", icon: <Shield className="h-3.5 w-3.5" />, match: (p: string) => p === "/admin", tourId: undefined },
    ] : []),
  ];

  const handleNav = (to: string) => {
    navigate(to);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="focus:outline-none">
            <BrandLogo iconSize="2.2em" />
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <button
                key={l.to}
                onClick={() => navigate(l.to)}
                data-tour={l.tourId}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors font-body flex items-center gap-1.5",
                  l.match(pathname)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                )}
              >
                {l.icon}
                {l.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant={aiChatOpen ? "default" : "outline"}
            size="sm"
            onClick={onAiChatToggle}
            className="gap-2 hidden sm:flex"
            data-tour="ai-chat"
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Chat</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onAiChatToggle}
            aria-label="AI Chat"
            className="h-9 w-9 sm:hidden"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            aria-label="Sign out"
            className="h-9 w-9 text-muted-foreground hover:text-destructive hidden md:flex"
          >
            <LogOut className="h-4 w-4" />
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-background p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border">
                  <BrandLogo iconSize="1.8em" />
                  {user?.email && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">{user.email}</p>
                  )}
                </div>
                <nav className="flex-1 py-2">
                  {links.map((l) => (
                    <button
                      key={l.to}
                      onClick={() => handleNav(l.to)}
                      className={cn(
                        "w-full px-4 py-3 text-sm font-medium text-left transition-colors flex items-center gap-2",
                        l.match(pathname)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                      )}
                    >
                      {l.icon}
                      {l.label}
                    </button>
                  ))}
                </nav>
                <div className="p-4 border-t border-border">
                  <Button variant="outline" size="sm" className="w-full gap-2 text-destructive" onClick={() => { signOut(); setMobileOpen(false); }}>
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
