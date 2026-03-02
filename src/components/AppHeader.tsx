import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function AppHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const links = [
    { to: "/", label: "Applications", match: (p: string) => p === "/" || p === "/applications" },
    { to: "/templates", label: "Templates", match: (p: string) => p === "/templates" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto flex h-12 items-center justify-between px-4 md:px-8">
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
    </header>
  );
}
