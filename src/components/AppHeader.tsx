import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun, Zap, UserCircle } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";

interface AppHeaderProps {
  onSignOut: () => void;
  userEmail?: string;
}

export default function AppHeader({ onSignOut, userEmail }: AppHeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();

  const links = [
    { to: "/", label: "Applications", match: (p: string) => p === "/" || p === "/applications" },
    { to: "/templates", label: "Templates", match: (p: string) => p === "/templates" },
    { to: "/profile", label: "Profile", match: (p: string) => p === "/profile" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto flex h-12 items-center justify-between px-4 md:px-8">
        {/* Logo + Nav */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 font-heading text-base font-bold tracking-tight text-primary hover:opacity-80 transition-opacity"
          >
            <Zap className="h-5 w-5 fill-primary text-primary" />
            JobBot
          </button>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <button
                key={l.to}
                onClick={() => navigate(l.to)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
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
          {userEmail && (
            <span className="text-sm text-muted-foreground hidden sm:inline mr-1">{userEmail}</span>
          )}
          <Button variant="ghost" size="sm" onClick={toggle} title="Toggle theme" className="h-8 w-8 p-0">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onSignOut} title="Sign out" className="h-8 w-8 p-0">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
