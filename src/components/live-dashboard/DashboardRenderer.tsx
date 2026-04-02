import { useState, useMemo, useEffect } from "react";
import type { DashboardData, DashboardSection, DashboardBranding } from "@/lib/dashboard/schema";
import KpiCard from "./KpiCard";
import ChartBlock from "./ChartBlock";
import DataTable from "./DataTable";
import ScenarioPanel from "./ScenarioPanel";
import FilterBar from "./FilterBar";
import { ExternalLink, Linkedin, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BRAND } from "@/lib/branding";

/* ── Google Fonts loader ── */
function useGoogleFonts(branding?: DashboardBranding) {
  useEffect(() => {
    if (!branding) return;
    const families = [branding.fontHeading, branding.fontBody].filter(Boolean);
    if (!families.length) return;
    const id = "live-dash-gfonts";
    if (document.getElementById(id)) {
      (document.getElementById(id) as HTMLLinkElement).href =
        `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&")}&display=swap`;
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&")}&display=swap`;
    document.head.appendChild(link);
  }, [branding]);
}

/* ── CSS custom properties from branding ── */
function brandingStyle(b?: DashboardBranding): React.CSSProperties {
  if (!b) return {};
  return {
    "--dash-primary": b.primary,
    "--dash-on-primary": b.onPrimary,
    "--dash-primary-container": b.primaryContainer,
    "--dash-on-primary-container": b.onPrimaryContainer,
    "--dash-secondary": b.secondary,
    "--dash-on-secondary": b.onSecondary,
    "--dash-surface": b.surface,
    "--dash-on-surface": b.onSurface,
    "--dash-surface-variant": b.surfaceVariant,
    "--dash-outline": b.outline,
    "--dash-error": b.error,
    "--dash-font-heading": b.fontHeading || "inherit",
    "--dash-font-body": b.fontBody || "inherit",
  } as React.CSSProperties;
}

/* ── Candidate Hero ── */
function CandidateHero({ data }: { data: DashboardData }) {
  const c = data.candidate;
  if (!c) return null;

  return (
    <div
      className="rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-5"
      style={{ background: data.branding?.primary || "hsl(var(--primary))", color: data.branding?.onPrimary || "hsl(var(--primary-foreground))" }}
    >
      {c.photoUrl ? (
        <img src={c.photoUrl} alt={c.name} className="h-20 w-20 rounded-full object-cover border-2 border-white/30" />
      ) : (
        <div className="h-20 w-20 rounded-full flex items-center justify-center bg-white/20">
          <User className="h-10 w-10 opacity-70" />
        </div>
      )}
      <div className="text-center md:text-left flex-1">
        <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--dash-font-heading)" }}>{c.name}</h2>
        <p className="opacity-90 mt-1 text-sm">{c.tagline}</p>
        <div className="flex items-center gap-3 mt-2 justify-center md:justify-start">
          {c.linkedIn && (
            <a href={c.linkedIn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 underline">
              <Linkedin className="h-3.5 w-3.5" /> LinkedIn
            </a>
          )}
          {c.portfolio && (
            <a href={c.portfolio} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 underline">
              <ExternalLink className="h-3.5 w-3.5" /> Portfolio
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Section Block ── */
function SectionBlock({ section, filterValues }: { section: DashboardSection; filterValues: Record<string, string> }) {
  const hasMetrics = section.metrics && section.metrics.length > 0;
  const hasCharts = section.charts && section.charts.length > 0;
  const hasTables = section.tables && section.tables.length > 0;

  const chartGrid = () => {
    switch (section.layout) {
      case "kpi-spotlight": return "grid-cols-1";
      case "full-width-timeline": return "grid-cols-1";
      case "split-panel": return "grid-cols-1 md:grid-cols-2";
      case "grid-cards": return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      case "map-table": return "grid-cols-1 lg:grid-cols-2";
      default: return "grid-cols-1 md:grid-cols-2";
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold" style={{ fontFamily: "var(--dash-font-heading)", color: "var(--dash-on-surface, hsl(var(--foreground)))" }}>
          {section.title}
        </h3>
        {section.description && (
          <p className="text-sm mt-0.5" style={{ color: "var(--dash-on-surface, hsl(var(--muted-foreground)))", opacity: 0.7 }}>{section.description}</p>
        )}
      </div>

      {hasMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {section.metrics!.map((m, i) => (
            <KpiCard key={i} metric={m} />
          ))}
        </div>
      )}

      {hasCharts && (
        <div className={`grid ${chartGrid()} gap-4`}>
          {section.charts!.map((c) => (
            <ChartBlock key={c.id} config={c} filterValues={filterValues} />
          ))}
        </div>
      )}

      {hasTables && (
        <div className="space-y-4">
          {section.tables!.map((t) => (
            <DataTable key={t.id} config={t} filterValues={filterValues} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Main Renderer ── */
export default function DashboardRenderer({ data }: { data: DashboardData }) {
  const [activeNav, setActiveNav] = useState(data.navigation?.[0]?.id || "");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const isMobile = useIsMobile();

  useGoogleFonts(data.branding);

  const handleFilterChange = (id: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [id]: value }));
  };

  // Filter sections by active nav
  const visibleSections = useMemo(() => {
    if (!data.navigation?.length || !activeNav) return data.sections;
    return data.sections.filter((s) => {
      if (s.navId) return s.navId === activeNav;
      return s.id === activeNav || s.id.startsWith(`${activeNav}-`) || s.id.startsWith(`${activeNav}_`);
    });
  }, [data.sections, data.navigation, activeNav]);

  // If nav filtering yields nothing, show all (fallback)
  const sectionsToRender = visibleSections.length > 0 ? visibleSections : data.sections;

  const footerText = data.footer?.text || "";
  const showBranding = data.footer?.showBranding !== false;

  return (
    <div className="min-h-screen" style={{ ...brandingStyle(data.branding), background: "var(--dash-surface, hsl(var(--background)))", fontFamily: "var(--dash-font-body)" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 shadow-sm" style={{ background: "var(--dash-primary, hsl(var(--primary)))", color: "var(--dash-on-primary, hsl(var(--primary-foreground)))" }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold" style={{ fontFamily: "var(--dash-font-heading)" }}>
              {data.meta.companyName} — {data.meta.jobTitle}
            </h1>
            <p className="text-xs opacity-80">{data.meta.department}</p>
          </div>
        </div>

        {/* Navigation */}
        {data.navigation?.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 pb-2">
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
              {data.navigation.map((nav) => (
                <button key={nav.id}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    activeNav === nav.id
                      ? "bg-white/20 text-inherit"
                      : "text-inherit opacity-70 hover:opacity-100 hover:bg-white/10"
                  }`}
                  onClick={() => setActiveNav(nav.id)}
                >
                  {nav.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Candidate hero */}
        <CandidateHero data={data} />

        {/* Global filters */}
        {data.globalFilters && data.globalFilters.length > 0 && (
          <FilterBar
            filters={data.globalFilters}
            values={filterValues}
            onChange={handleFilterChange}
          />
        )}

        {/* Sections */}
        {sectionsToRender.map((section) => (
          <SectionBlock key={section.id} section={section} filterValues={filterValues} />
        ))}

        {/* CFO Scenarios */}
        {data.cfoScenarios?.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--dash-font-heading)", color: "var(--dash-on-surface, hsl(var(--foreground)))" }}>
              Scenario Analysis
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.cfoScenarios.map((s) => (
                <ScenarioPanel key={s.id} scenario={s} />
              ))}
            </div>
          </section>
        )}

        {/* Agentic Workforce */}
        {data.agenticWorkforce?.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--dash-font-heading)", color: "var(--dash-on-surface, hsl(var(--foreground)))" }}>
              AI-Powered Workforce
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.agenticWorkforce.map((agent, i) => (
                <div key={i} className="rounded-lg p-4 space-y-2 border"
                  style={{ background: "var(--dash-surface-variant, hsl(var(--card)))", borderColor: "var(--dash-outline, hsl(var(--border)))" }}>
                  <h4 className="font-semibold text-sm" style={{ color: "var(--dash-on-surface, hsl(var(--card-foreground)))" }}>{agent.name}</h4>
                  <p className="text-xs" style={{ color: "var(--dash-on-surface, hsl(var(--muted-foreground)))", opacity: 0.7 }}>{agent.coreFunctionality}</p>
                  <p className="text-xs italic" style={{ color: "var(--dash-on-surface, hsl(var(--muted-foreground)))", opacity: 0.5 }}>Teams: {agent.interfacingTeams}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t py-4 text-center text-xs" style={{ color: "var(--dash-on-surface, hsl(var(--muted-foreground)))", opacity: 0.6, borderColor: "var(--dash-outline, hsl(var(--border)))" }}>
        {footerText && <span>{footerText}</span>}
        {footerText && showBranding && <span> · </span>}
        {showBranding && <span>Built with {BRAND.name}</span>}
      </footer>
    </div>
  );
}
