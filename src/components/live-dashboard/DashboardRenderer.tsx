import { useState, useMemo, useEffect, useRef } from "react";
import type { DashboardData, DashboardSection, DashboardBranding } from "@/lib/dashboard/schema";
import KpiCard from "./KpiCard";
import ChartBlock, { type DrillFilter } from "./ChartBlock";
import DataTable from "./DataTable";
import ScenarioPanel from "./ScenarioPanel";
import {
  ExternalLink, Linkedin, User, Menu, X,
  LayoutDashboard, TrendingUp, Users, DollarSign, Target,
  BarChart3, Briefcase, Rocket, ShieldCheck, Brain,
  Calculator, GitBranch, MapPin, Zap, PieChart, Activity,
  Database, Settings, Layers, Search, FileText, Globe,
  Heart, Award, Clock, Package, Truck, CreditCard,
  Building2, Lightbulb, Gauge, type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";


/* ── Lucide icon map ── */
const ICON_MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard, dashboard: LayoutDashboard,
  "trending-up": TrendingUp, trending_up: TrendingUp,
  users: Users, people: Users, groups: Users,
  "dollar-sign": DollarSign, attach_money: DollarSign, payments: DollarSign,
  target: Target,
  "bar-chart-3": BarChart3, analytics: BarChart3, bar_chart: BarChart3,
  briefcase: Briefcase, work: Briefcase,
  rocket: Rocket,
  "shield-check": ShieldCheck, security: ShieldCheck, verified_user: ShieldCheck, shield: ShieldCheck,
  brain: Brain, psychology: Brain, smart_toy: Brain,
  calculator: Calculator, account_balance: Calculator,
  "git-branch": GitBranch,
  "map-pin": MapPin, location_on: MapPin, place: MapPin,
  zap: Zap, bolt: Zap, flash_on: Zap,
  "pie-chart": PieChart, donut_large: PieChart,
  activity: Activity, monitoring: Activity, speed: Activity,
  database: Database, storage: Database,
  settings: Settings, tune: Settings,
  layers: Layers, stacks: Layers,
  search: Search,
  "file-text": FileText, description: FileText, article: FileText,
  globe: Globe, language: Globe, public: Globe,
  heart: Heart, favorite: Heart,
  award: Award, emoji_events: Award, star: Award,
  clock: Clock, schedule: Clock, history: Clock, access_time: Clock,
  package: Package, inventory: Package, inventory_2: Package,
  truck: Truck, local_shipping: Truck,
  "credit-card": CreditCard, credit_card: CreditCard,
  "building-2": Building2, business: Building2, corporate_fare: Building2, apartment: Building2,
  lightbulb: Lightbulb, tips_and_updates: Lightbulb,
  gauge: Gauge, data_usage: Gauge,
};

function resolveIcon(name?: string): LucideIcon {
  if (!name) return LayoutDashboard;
  const key = name.toLowerCase().replace(/\s+/g, "-");
  return ICON_MAP[key] || LayoutDashboard;
}

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
    "--dash-background": b.background || b.surface || "hsl(var(--background))",
  } as React.CSSProperties;
}

/* ── Inline fade-in keyframes ── */
const fadeInStyle: React.CSSProperties = {
  animation: "dashFadeIn 0.4s ease-out both",
};

/* ── Subtle SVG wave pattern for background ── */
const WAVE_PATTERN = `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q25 30 50 50 T100 50' fill='none' stroke='%23000' stroke-width='0.5' opacity='0.04'/%3E%3Cpath d='M0 70 Q25 50 50 70 T100 70' fill='none' stroke='%23000' stroke-width='0.5' opacity='0.03'/%3E%3C/svg%3E")`;

/* ── Candidate Hero ── */
function CandidateHero({ data }: { data: DashboardData }) {
  const c = data.candidate;
  if (!c) return null;

  return (
    <div
      className="rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-5"
      style={{
        background: `linear-gradient(135deg, ${data.branding?.primary || "hsl(var(--primary))"}, ${data.branding?.primaryContainer || "hsl(var(--primary))"})`,
        color: data.branding?.onPrimary || "hsl(var(--primary-foreground))",
      }}
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

/* ── Active Filter Pills ── */
function ActiveFilterPills({ filters, onRemove, onClearAll }: {
  filters: Record<string, DrillFilter>;
  onRemove: (chartId: string) => void;
  onClearAll: () => void;
}) {
  const entries = Object.entries(filters);
  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {entries.map(([chartId, f]) => (
        <span
          key={chartId}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background: "var(--dash-primary-container, hsl(var(--accent)))",
            color: "var(--dash-on-primary-container, hsl(var(--accent-foreground)))",
          }}
        >
          {f.value}
          <button
            onClick={() => onRemove(chartId)}
            className="ml-0.5 rounded-full hover:opacity-70 transition-opacity"
            aria-label={`Remove filter ${f.value}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {entries.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs underline opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "var(--dash-on-surface, hsl(var(--foreground)))" }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/* ── Section Block ── */
function SectionBlock({ section, drillFilters, onDrillDown }: {
  section: DashboardSection;
  drillFilters: Record<string, DrillFilter>;
  onDrillDown: (chartId: string, field: string, value: string) => void;
}) {
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
    <section className="space-y-4" style={fadeInStyle}>
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
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div className="transition-transform duration-200 hover:scale-105">
                  <KpiCard metric={m} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                <p className="font-semibold">{m.label}</p>
                <p>{m.value}{m.change ? ` (${m.change})` : ""}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {hasCharts && (
        <div className={`grid ${chartGrid()} gap-4`}>
          {section.charts!.map((c) => (
            <ChartBlock key={c.id} config={c} onDrillDown={onDrillDown} activeDrillValues={drillFilters} />
          ))}
        </div>
      )}

      {hasTables && (
        <div className="space-y-4">
          {section.tables!.map((t) => (
            <DataTable key={t.id} config={t} drillFilters={drillFilters} />
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);

  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  useGoogleFonts(data.branding);

  // Scroll content to top on nav change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeNav]);

  const handleFilterChange = (id: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [id]: value }));
  };

  const hasNav = data.navigation && data.navigation.length > 0;

  const visibleSections = useMemo(() => {
    if (!data.navigation?.length || !activeNav) return data.sections;
    return data.sections.filter((s) => {
      if (s.navId) return s.navId === activeNav;
      return s.id === activeNav || s.id.startsWith(`${activeNav}-`) || s.id.startsWith(`${activeNav}_`);
    });
  }, [data.sections, data.navigation, activeNav]);

  const sectionsToRender = visibleSections.length > 0 ? visibleSections : data.sections;

  const footerText = data.footer?.text || "";
  const showBranding = data.footer?.showBranding !== false;

  // Show first nav item as "overview" for hero
  const isOverview = activeNav === (data.navigation?.[0]?.id || "");
  const isCfoView = activeNav === "cfo-view";
  const isAgenticView = activeNav === "agentic-workforce";

  const navItems = data.navigation || [];

  // Sidebar: on desktop, collapsed = icon rail (w-14); expanded = w-[260px]
  // On mobile: overlay or hidden
  const sidebarExpanded = isMobile ? sidebarOpen : desktopSidebarOpen;

  return (
    <TooltipProvider delayDuration={200}>
      {/* Inject fade-in keyframes */}
      <style>{`@keyframes dashFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div
        className="min-h-screen flex flex-col"
        style={{
          ...brandingStyle(data.branding),
          background: `var(--dash-background, hsl(var(--background)))`,
          backgroundImage: WAVE_PATTERN,
          backgroundRepeat: "repeat",
          fontFamily: "var(--dash-font-body)",
        }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-30 shadow-md"
          style={{
            background: `linear-gradient(135deg, var(--dash-primary, hsl(var(--primary))), ${data.branding?.primaryContainer || "var(--dash-primary, hsl(var(--primary)))"})`,
            color: "var(--dash-on-primary, hsl(var(--primary-foreground)))",
          }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            {hasNav && (
              <button
                onClick={() => isMobile ? setSidebarOpen(!sidebarOpen) : setDesktopSidebarOpen(!desktopSidebarOpen)}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-xl font-bold truncate" style={{ fontFamily: "var(--dash-font-heading)" }}>
                {data.meta.companyName} — {data.meta.department}
              </h1>
              <p className="text-xs opacity-80 truncate">{data.meta.jobTitle}</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 relative overflow-hidden">
          {/* Mobile overlay */}
          {isMobile && sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          {hasNav && (
            <aside
              className={`
                ${isMobile ? "fixed left-0 top-0 bottom-0 z-50" : "relative shrink-0"}
                transition-all duration-200 ease-in-out overflow-hidden
                ${isMobile
                  ? (sidebarOpen ? "w-[260px]" : "w-0")
                  : (sidebarExpanded ? "w-[260px]" : "w-14")
                }
              `}
              style={{
                background: "var(--dash-surface-variant, hsl(var(--card)))",
                borderRight: `1px solid var(--dash-outline, hsl(var(--border)))`,
              }}
            >
              <div className={`${sidebarExpanded ? "w-[260px]" : "w-14"} h-full flex flex-col`}>
                {/* Sidebar header */}
                <div className="p-3 flex items-center justify-between border-b" style={{ borderColor: "var(--dash-outline, hsl(var(--border)))" }}>
                  {sidebarExpanded && (
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--dash-on-surface, hsl(var(--foreground)))", fontFamily: "var(--dash-font-heading)" }}>
                      Navigation
                    </span>
                  )}
                  {isMobile && sidebarOpen && (
                    <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-black/5 transition-colors ml-auto">
                      <X className="h-4 w-4" style={{ color: "var(--dash-on-surface, hsl(var(--foreground)))" }} />
                    </button>
                  )}
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                  {navItems.map((nav) => {
                    const isActive = activeNav === nav.id;
                    const IconComponent = resolveIcon(nav.icon);

                    const button = (
                      <button
                        key={nav.id}
                        className={`w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                          sidebarExpanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"
                        } ${isActive ? "font-semibold" : "opacity-70 hover:opacity-100"}`}
                        style={{
                          background: isActive ? "var(--dash-primary, hsl(var(--primary)))" : "transparent",
                          color: isActive
                            ? "var(--dash-on-primary, hsl(var(--primary-foreground)))"
                            : "var(--dash-on-surface, hsl(var(--foreground)))",
                        }}
                        onClick={() => {
                          setActiveNav(nav.id);
                          if (isMobile) setSidebarOpen(false);
                        }}
                      >
                        <IconComponent className="h-4 w-4 shrink-0" />
                        {sidebarExpanded && <span className="truncate">{nav.label}</span>}
                      </button>
                    );

                    // Show tooltip on collapsed desktop sidebar
                    if (!sidebarExpanded && !isMobile) {
                      return (
                        <Tooltip key={nav.id}>
                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            {nav.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return button;
                  })}
                </nav>
              </div>
            </aside>
          )}

          {/* Main content */}
          <main className="flex-1 min-w-0 overflow-y-auto" ref={contentRef}>
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
              {/* Candidate hero — only on overview */}
              {isOverview && <CandidateHero data={data} />}

              {/* Global filters */}
              {data.globalFilters && data.globalFilters.length > 0 && (
                <FilterBar filters={data.globalFilters} values={filterValues} onChange={handleFilterChange} />
              )}

              {/* Sections */}
              {!isCfoView && !isAgenticView && sectionsToRender.map((section) => (
                <SectionBlock key={section.id} section={section} filterValues={filterValues} />
              ))}

              {/* CFO Scenarios */}
              {(isCfoView || (!hasNav && data.cfoScenarios?.length > 0)) && (
                <section className="space-y-4">
                  <h3 className="text-lg font-bold" style={{ fontFamily: "var(--dash-font-heading)", color: "var(--dash-on-surface, hsl(var(--foreground)))" }}>
                    Scenario Analysis
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {data.cfoScenarios?.map((s) => (
                      <Tooltip key={s.id}>
                        <TooltipTrigger asChild>
                          <div>
                            <ScenarioPanel scenario={s} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[280px]">
                          <p className="font-semibold">{s.title}</p>
                          <p>{s.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </section>
              )}

              {/* Agentic Workforce */}
              {(isAgenticView || (!hasNav && data.agenticWorkforce?.length > 0)) && (
                <section className="space-y-4" style={fadeInStyle}>
                  <h3 className="text-lg font-bold" style={{ fontFamily: "var(--dash-font-heading)", color: "var(--dash-on-surface, hsl(var(--foreground)))" }}>
                    AI-Powered Workforce
                  </h3>
                  {/* WIP Banner */}
                  <div
                    className="rounded-lg px-4 py-3 flex items-start gap-3"
                    style={{
                      background: "var(--dash-primary-container, hsl(var(--muted)))",
                      color: "var(--dash-on-primary-container, hsl(var(--muted-foreground)))",
                    }}
                  >
                    <Rocket className="h-5 w-5 shrink-0 mt-0.5 opacity-80" />
                    <div>
                      <p className="text-sm font-semibold">Work in Progress</p>
                      <p className="text-xs opacity-80 mt-0.5">
                        Agentic workforce capabilities are being developed and will evolve. The agents listed below represent a proposed AI-augmented operating model for this role.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.agenticWorkforce?.map((agent, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div className="rounded-lg p-4 space-y-2 border transition-transform duration-200 hover:scale-105 cursor-default"
                            style={{ background: "var(--dash-surface-variant, hsl(var(--card)))", borderColor: "var(--dash-outline, hsl(var(--border)))" }}>
                            <h4 className="font-semibold text-sm" style={{ color: "var(--dash-on-surface, hsl(var(--card-foreground)))" }}>{agent.name}</h4>
                            <p className="text-xs line-clamp-2" style={{ color: "var(--dash-on-surface, hsl(var(--muted-foreground)))", opacity: 0.7 }}>{agent.coreFunctionality}</p>
                            <p className="text-xs italic" style={{ color: "var(--dash-on-surface, hsl(var(--muted-foreground)))", opacity: 0.5 }}>Teams: {agent.interfacingTeams}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[280px]">
                          <p className="font-semibold">{agent.name}</p>
                          <p>{agent.coreFunctionality}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </section>
              )}

              {/* Footer — only at the bottom of the last section view */}
              <footer className="border-t pt-4 mt-8 text-center text-xs" style={{ color: "var(--dash-on-surface, hsl(var(--muted-foreground)))", opacity: 0.5, borderColor: "var(--dash-outline, hsl(var(--border)))" }}>
                {footerText && <span>{footerText}</span>}
                {footerText && showBranding && <span> · </span>}
                {showBranding && <span>Built by <a href="https://saasless.ai/author" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 transition-opacity">saasless.ai</a></span>}
              </footer>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
