import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import {
  getAllHelp,
  getHelpForRoute,
  searchHelp,
  getHelpBySlug,
  type HelpMeta,
} from "@/lib/helpRegistry";

interface HelpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function HelpEntry({
  entry,
  onNavigate,
}: {
  entry: HelpMeta;
  onNavigate: (slug: string) => void;
}) {
  return (
    <AccordionItem value={entry.slug} className="border-border">
      <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
        {entry.title}
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pb-4 text-sm text-muted-foreground">
        <p>{entry.summary}</p>

        {entry.steps && entry.steps.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-1.5">
              How to use
            </h4>
            <ol className="list-decimal list-inside space-y-1">
              {entry.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {entry.tips && entry.tips.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-1.5">
              Tips
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {entry.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {entry.relatedSlugs && entry.relatedSlugs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground">Related:</span>
            {entry.relatedSlugs.map((slug) => {
              const related = getHelpBySlug(slug);
              if (!related) return null;
              return (
                <Badge
                  key={slug}
                  variant="secondary"
                  className="cursor-pointer text-xs"
                  onClick={() => onNavigate(slug)}
                >
                  {related.title}
                </Badge>
              );
            })}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function HelpDrawer({ open, onOpenChange }: HelpDrawerProps) {
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const [expandedSlugs, setExpandedSlugs] = useState<string[]>([]);

  const contextual = useMemo(() => getHelpForRoute(pathname), [pathname]);
  const contextualSlugs = useMemo(
    () => new Set(contextual.map((h) => h.slug)),
    [contextual]
  );

  // Auto-expand first contextual topic when drawer opens
  useEffect(() => {
    if (open && contextual.length > 0) {
      setExpandedSlugs([contextual[0].slug]);
    } else if (open) {
      setExpandedSlugs([]);
    }
  }, [open, contextual]);

  const results = useMemo(() => {
    if (!query.trim()) return getAllHelp();
    return searchHelp(query);
  }, [query]);

  const otherResults = useMemo(
    () => results.filter((h) => !contextualSlugs.has(h.slug)),
    [results, contextualSlugs]
  );

  const displayedResults = query.trim() ? results : otherResults;

  const sectionLabel = query.trim()
    ? `Search results (${results.length})`
    : "All Help Topics";

  const handleNavigate = (slug: string) => {
    setExpandedSlugs((prev) =>
      prev.includes(slug) ? prev : [...prev, slug]
    );
    setTimeout(() => {
      document
        .querySelector(`[data-help-slug="${slug}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md flex flex-col p-0"
        side="right"
      >
        {/* ── STICKY HEADER ZONE ── */}
        <div className="flex-shrink-0 p-6 pb-0 space-y-4">
          <SheetHeader>
            <SheetTitle className="font-heading">Help & Documentation</SheetTitle>
          </SheetHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search help topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
            {!query.trim() && contextual.length > 0
              ? "Relevant to this page"
              : sectionLabel}
          </h3>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
          {/* Contextual section */}
          {!query.trim() && contextual.length > 0 && (
            <div className="mb-6 bg-accent/50 rounded-lg p-3 -mx-1">
              <Accordion
                type="multiple"
                value={expandedSlugs}
                onValueChange={setExpandedSlugs}
              >
                {contextual.map((entry) => (
                  <div key={entry.slug} data-help-slug={entry.slug}>
                    <HelpEntry entry={entry} onNavigate={handleNavigate} />
                  </div>
                ))}
              </Accordion>
            </div>
          )}

          {/* Divider + label for remaining topics when contextual is shown */}
          {!query.trim() && contextual.length > 0 && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              All Help Topics ({otherResults.length})
            </h3>
          )}

          {/* Main list */}
          {displayedResults.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No matching help topics found.
            </p>
          ) : (
            <Accordion
              type="multiple"
              value={expandedSlugs}
              onValueChange={setExpandedSlugs}
            >
              {displayedResults.map((entry) => (
                <div key={entry.slug} data-help-slug={entry.slug}>
                  <HelpEntry entry={entry} onNavigate={handleNavigate} />
                </div>
              ))}
            </Accordion>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
