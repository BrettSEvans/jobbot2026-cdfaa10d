import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun, Zap, ArrowRightLeft } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";

interface AppHeaderProps {
  onSignOut: () => void;
}

export default function AppHeader({ onSignOut }: AppHeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const { guardedNavigate } = useNavigationGuard();
  const { activePersona, isImpersonating, switchToSelf } = useImpersonation();

  // Build display name from active persona
  const displayName = activePersona
    ? [activePersona.first_name, activePersona.last_name].filter(Boolean).join(" ") ||
      activePersona.display_name ||
      ""
    : "";

  const links = [
    { to: "/", label: "Applications", match: (p: string) => p === "/" || p === "/applications" },
    { to: "/templates", label: "Templates", match: (p: string) => p === "/templates" },
    { to: "/pricing", label: "Pricing", match: (p: string) => p === "/pricing" },
    { to: "/profile", label: "Profile", match: (p: string) => p === "/profile" },
  ];

  return (
    <>
      {/* Skip navigation link — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>

      {/* Impersonation banner */}
      {isImpersonating && (
        <div className="bg-primary text-primary-foreground text-center text-sm py-1.5 px-4 flex items-center justify-center gap-3">
          <span>
            Viewing as <strong>{displayName}</strong> (test user)
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-6 text-xs px-2"
            onClick={() => {
              switchToSelf();
              navigate("/profile");
            }}
          >
            <ArrowRightLeft className="mr-1 h-3 w-3" /> Switch Back
          </Button>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex h-12 items-center justify-between px-4 md:px-8">
          {/* Logo + Nav */}
          <div className="flex items-center gap-4">
            <button
onClick={() => guardedNavigate(() => navigate("/"))}
              className="flex items-center gap-1.5 font-heading text-base font-bold tracking-tight text-primary hover:opacity-80 transition-opacity"
            >
              <Zap className="h-5 w-5 fill-primary text-primary" />
              JobBot
            </button>
            <nav className="flex items-center gap-1">
              {links.map((l) => (
                  <button
                    key={l.to}
                    onClick={() => guardedNavigate(() => navigate(l.to))}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      l.match(pathname)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {l.label}
                  </button>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            {displayName && (
              <span className="text-sm text-muted-foreground hidden sm:inline mr-1">
                {displayName}
                {isImpersonating && (
                  <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                    Test
                  </Badge>
                )}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} className="h-8 w-8 p-0">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => guardedNavigate(onSignOut)}
              aria-label="Sign out"
              className="h-8 w-8 p-0"
              disabled={isImpersonating}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
