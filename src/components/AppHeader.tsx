import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Sparkles, Sun, Moon, Shield, LogOut, Menu, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin check using the shared user from useAuth — no nested useAuth call
  const { data: isAdmin } = useQuery({
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
          {user && (
            <Avatar className="h-7 w-7 shrink-0">
              {(user.user_metadata?.avatar_url || user.user_metadata?.picture) && (
                <AvatarImage src={user.user_metadata?.avatar_url || user.user_metadata?.picture} alt="Avatar" />
              )}
              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                {user.email?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          )}
          <ThemeToggle />
          <Button
            size="sm"
            onClick={onAiChatToggle}
            className={cn(
              "gap-2 hidden sm:flex bg-primary text-white dark:text-black border-none hover:bg-primary/90",
              aiChatOpen && "ring-2 ring-primary/50"
            )}
            data-tour="ai-chat"
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Chat</span>
          </Button>
          <Button
            size="icon"
            onClick={onAiChatToggle}
            aria-label="AI Chat"
            className="h-9 w-9 sm:hidden bg-primary text-white dark:text-black border-none hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                className="h-9 w-9 text-muted-foreground hover:text-destructive hidden md:flex"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to sign out of your account?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={signOut}>Sign Out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-2 text-destructive">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Sign out?</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to sign out of your account?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { signOut(); setMobileOpen(false); }}>Sign Out</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
