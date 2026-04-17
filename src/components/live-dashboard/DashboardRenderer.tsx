import { useState, useMemo, useEffect, useRef } from "react";
import type { DashboardData, DashboardSection, DashboardBranding } from "@/lib/dashboard/schema";
import { buildStyleFamilyVars, resolveStyleFamily, STYLE_FAMILIES } from "@/lib/dashboard/styleFamilies";
import KpiCard from "./KpiCard";
import ChartBlock, { type DrillFilter } from "./ChartBlock";
import DataTable from "./DataTable";
import ScenarioPanel from "./ScenarioPanel";
import {
  ExternalLink, Linkedin, User, Menu, X, Inbox, ChevronRight, Printer,
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
    const family = resolveStyleFamily(branding.styleFamily);
    const familyTokens = STYLE_FAMILIES[family];
    const families = [
      branding.fontHeading || familyTokens.fontHeading,
      branding.fontBody || familyTokens.fontBody,
    ].filter(Boolean);
    if (!families.length) return;
    const id = "live-dash-gfonts";
    const href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700;800`).join("&")}&display=swap`;
    if (document.getElementById(id)) {
      (document.getElementById(id) as HTMLLinkElement).href = href;
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [branding]);
}

/* ── Neumorphic color enforcement ── */
function hexToLuminance(hex: string): number {
  const c = hex.replace("#", "");
  if (c.length < 6) return 1;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Apply style-family defaults to branding. The chosen family wins over
 *  any AI-supplied surface/background that conflicts with its identity. */
function applyStyleFamilyToBranding(b: DashboardBranding): DashboardBranding {
  const family = resolveStyleFamily(b.styleFamily);
  const tokens = STYLE_FAMILIES[family];

  if (family === "neumorphic-soft") {
    const NEU_SURFACE = "#E0E5EC";
    const NEU_BG = "#E0E5EC";
    const NEU_VARIANT = "#D8DEE6";
    const NEU_TEXT = "#3D4852";

    let surface = b.surface || NEU_SURFACE;
    let background = b.background || NEU_BG;
    let surfaceVariant = b.surfaceVariant || NEU_VARIANT;
    let onSurface = b.onSurface || NEU_TEXT;

    const extractHex = (val: string) => {
      const m = val.match(/#[0-9A-Fa-f]{6}/);
      return m ? m[0] : null;
    };
    const surfaceHex = extractHex(surface);
    const bgHex = extractHex(typeof background === "string" ? background : "");

    if (surfaceHex && (hexToLuminance(surfaceHex) > 0.88 || hexToLuminance(surfaceHex) < 0.4)) {
      surface = NEU_SURFACE;
      surfaceVariant = NEU_VARIANT;
      onSurface = NEU_TEXT;
    }
    if (bgHex && hexToLuminance(bgHex) > 0.88) background = NEU_BG;

    return { ...b, styleFamily: family, surface, background, surfaceVariant, onSurface };
  }

  // Non-neumorphic families: ALWAYS apply the family's surface/background tokens
  // so we never see a mixed-style dashboard.
  return {
    ...b,
    styleFamily: family,
    surface: tokens.surface,
    background: tokens.background,
    surfaceVariant: tokens.surfaceVariant,
    onSurface: tokens.onSurface,
  };
}

/* ── CSS custom properties from branding + style family ── */
function brandingStyle(b?: DashboardBranding): React.CSSProperties {
  if (!b) return {};
  const nb = applyStyleFamilyToBranding(b);
  const family = resolveStyleFamily(nb.styleFamily);
  const familyVars = buildStyleFamilyVars(family);
  const tokens = STYLE_FAMILIES[family];

  return {
    "--dash-primary": nb.primary,
    "--dash-on-primary": nb.onPrimary,
    "--dash-primary-container": nb.primaryContainer,
    "--dash-on-primary-container": nb.onPrimaryContainer,
    "--dash-secondary": nb.secondary,
    "--dash-on-secondary": nb.onSecondary,
    "--dash-outline": nb.outline,
    "--dash-error": nb.error,
    "--dash-font-heading": `${nb.fontHeading || tokens.fontHeading}, sans-serif`,
    "--dash-font-body": `${nb.fontBody || tokens.fontBody}, sans-serif`,
    ...familyVars,
  } as React.CSSProperties;
}

/* ── Inline fade-in keyframes ── */
const fadeInStyle: React.CSSProperties = {
  animation: "dashFadeIn 0.4s ease-out both",
};

/* ── Legacy neumorphic shadow tokens (kept for ScenarioPanel + non-themed surfaces) ── */
const NEU_SHADOW = "9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)";
const NEU_SHADOW_HOVER = "12px 12px 20px rgb(163,177,198,0.7), -12px -12px 20px rgba(255,255,255,0.6)";
const NEU_SHADOW_SM = "5px 5px 10px rgb(163,177,198,0.6), -5px -5px 10px rgba(255,255,255,0.5)";
const NEU_SHADOW_INSET = "inset 6px 6px 10px rgb(163,177,198,0.6), inset -6px -6px 10px rgba(255,255,255,0.5)";
const NEU_SHADOW_INSET_DEEP = "inset 10px 10px 20px rgb(163,177,198,0.7), inset -10px -10px 20px rgba(255,255,255,0.6)";

export { NEU_SHADOW, NEU_SHADOW_HOVER, NEU_SHADOW_SM, NEU_SHADOW_INSET, NEU_SHADOW_INSET_DEEP };

/* ── Candidate Hero ── */
function CandidateHero({ data }: { data: DashboardData }) {
  const c = data.candidate;
  if (!c) return null;

  return (
    <div
      className="rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row items-center gap-5 transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${data.branding?.primary || "#0a8080"}, ${data.branding?.primaryContainer || "#0a8080"})`,
        color: data.branding?.onPrimary || "#fff",
        boxShadow: NEU_SHADOW,
      }}
    >
      {c.photoUrl ? (
        <img src={c.photoUrl} alt={c.name} className="h-20 w-20 rounded-full object-cover border-2 border-white/30" />
      ) : (
        <div
          className="h-20 w-20 rounded-full flex items-center justify-center"
          style={{ boxShadow: NEU_SHADOW_INSET_DEEP, background: "rgba(255,255,255,0.15)" }}
        >
          <User className="h-10 w-10 opacity-70" />
        </div>
      )}
      <div className="text-center md:text-left flex-1">
        <h2 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "var(--dash-font-heading)" }}>{c.name}</h2>
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
          className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-1 text-xs font-medium transition-all duration-300"
          style={{
            background: "var(--dash-surface, #E0E5EC)",
            color: "var(--dash-on-surface, #3D4852)",
            boxShadow: NEU_SHADOW_SM,
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
function SectionBlock({ section, drillFilters, onDrillDown, isFirstSection }: {
  section: DashboardSection;
  drillFilters: Record<string, DrillFilter>;
  onDrillDown: (chartId: string, field: string, value: string) => void;
  isFirstSection?: boolean;
}) {
  const hasMetrics = section.metrics && section.metrics.length > 0;
  const hasCharts = section.charts && section.charts.length > 0;
  const hasTables = section.tables && section.tables.length > 0;
  const isEmpty = !hasMetrics && !hasCharts && !hasTables;

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
          <div
            className="mt-2 px-4 py-3 border-l-4 text-sm transition-all duration-300"
            style={{
              background: "var(--dash-surface-variant, var(--dash-surface, #E0E5EC))",
              borderLeftColor: "var(--dash-primary, #0a8080)",
              color: "var(--dash-on-surface, #3D4852)",
              opacity: 0.92,
              boxShadow: "var(--dash-inset-shadow, none)",
              border: "var(--dash-card-border, none)",
              borderLeftWidth: "4px",
              borderRadius: "var(--dash-radius-sm, 16px)",
            }}
          >
            {section.description}
          </div>
        )}
      </div>

      {hasMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {section.metrics!.map((m, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div className="transition-all duration-300 ease-out hover:-translate-y-0.5">
                  <KpiCard metric={m} spotlight={isFirstSection && i === 0} />
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

      {isEmpty && (
        <div
          className="flex flex-col items-center justify-center py-12 text-center"
          style={{
            background: "var(--dash-surface, #E0E5EC)",
            boxShadow: "var(--dash-inset-shadow, var(--dash-card-shadow, none))",
            border: "var(--dash-card-border, none)",
            borderRadius: "var(--dash-radius, 32px)",
          }}
        >
          <Inbox className="h-10 w-10 mb-2" style={{ color: "var(--dash-on-surface-muted, #6B7280)", opacity: 0.4 }} />
          <p className="text-sm" style={{ color: "var(--dash-on-surface-muted, #6B7280)" }}>No data available for this section</p>
        </div>
      )}
    </section>
  );
}

/* ── Main Renderer ── */
export default function DashboardRenderer({ data }: { data: DashboardData }) {
  const [activeNav, setActiveNav] = useState(data.navigation?.[0]?.id || "");
  const [drillFilters, setDrillFilters] = useState<Record<string, DrillFilter>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);

  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  useGoogleFonts(data.branding);

  // Scroll content to top and clear drill filters on nav change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setDrillFilters({});
  }, [activeNav]);

  const toggleDrillFilter = (chartId: string, field: string, value: string) => {
    setDrillFilters((prev) => {
      const existing = prev[chartId];
      if (existing && existing.value === value) {
        const next = { ...prev };
        delete next[chartId];
        return next;
      }
      return { ...prev, [chartId]: { field, value } };
    });
  };

  const removeDrillFilter = (chartId: string) => {
    setDrillFilters((prev) => {
      const next = { ...prev };
      delete next[chartId];
      return next;
    });
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

  // Resolve style family for header style decisions
  const styleFamily = resolveStyleFamily(data.branding?.styleFamily);
  const familyTokens = STYLE_FAMILIES[styleFamily];

  const headerBackground =
    familyTokens.headerStyle === "minimal"
      ? "var(--dash-surface, #fff)"
      : familyTokens.headerStyle === "flat"
        ? "var(--dash-primary, #0a8080)"
        : `linear-gradient(135deg, var(--dash-primary, #0a8080), ${data.branding?.primaryContainer || "var(--dash-primary, #0a8080)"})`;

  const headerColor =
    familyTokens.headerStyle === "minimal"
      ? "var(--dash-on-surface, #1A1A1A)"
      : "var(--dash-on-primary, #fff)";

  const headerShadow =
    styleFamily === "neumorphic-soft"
      ? "0 4px 16px rgba(163,177,198,0.5)"
      : familyTokens.headerStyle === "minimal"
        ? "0 1px 0 rgba(0,0,0,0.08)"
        : "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)";

  return (
    <TooltipProvider delayDuration={200}>
      {/* Inject fade-in keyframes */}
      <style>{`@keyframes dashFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div
        className="min-h-screen flex flex-col"
        style={{
          ...brandingStyle(data.branding),
          background: `var(--dash-bg, var(--dash-background, #E0E5EC))`,
          fontFamily: "var(--dash-font-body)",
        }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-30"
          style={{
            background: headerBackground,
            color: headerColor,
            boxShadow: headerShadow,
            borderBottom: familyTokens.headerStyle === "minimal" ? "1px solid rgba(0,0,0,0.06)" : "none",
          }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            {hasNav && (
              <button
                onClick={() => isMobile ? setSidebarOpen(!sidebarOpen) : setDesktopSidebarOpen(!desktopSidebarOpen)}
                className="p-1.5 rounded-md hover:bg-black/5 transition-all duration-300 shrink-0"
                aria-label="Toggle navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-xl font-extrabold tracking-tight truncate" style={{ fontFamily: "var(--dash-font-heading)" }}>
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
                background: "var(--dash-sidebar-bg, var(--dash-surface-variant, #D8DEE6))",
                boxShadow: styleFamily === "neumorphic-soft" ? NEU_SHADOW_SM : "1px 0 0 rgba(0,0,0,0.06)",
                borderRight: styleFamily !== "neumorphic-soft" ? "var(--dash-card-border, none)" : "none",
              }}
            >
              <div className={`${sidebarExpanded ? "w-[260px]" : "w-14"} h-full flex flex-col`}>
                {/* Sidebar header */}
                <div className="p-3 flex items-center justify-between" style={{ borderBottom: "none" }}>
                  {sidebarExpanded && (
                    <span className="text-sm font-bold tracking-tight truncate" style={{ color: "var(--dash-on-surface, #3D4852)", fontFamily: "var(--dash-font-heading)" }}>
                      Navigation
                    </span>
                  )}
                  {isMobile && sidebarOpen && (
                    <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-2xl hover:bg-black/5 transition-all duration-300 ml-auto">
                      <X className="h-4 w-4" style={{ color: "var(--dash-on-surface, #3D4852)" }} />
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
                        className={`w-full flex items-center gap-2.5 text-sm font-medium transition-all duration-300 ease-out text-left ${
                          sidebarExpanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"
                        } ${isActive ? "font-bold" : "opacity-70 hover:opacity-100 hover:-translate-y-px"}`}
                        style={{
                          background: isActive ? "var(--dash-primary, #0a8080)" : "transparent",
                          color: isActive
                            ? "var(--dash-on-primary, #fff)"
                            : "var(--dash-on-surface, #3D4852)",
                          boxShadow: isActive && styleFamily === "neumorphic-soft" ? NEU_SHADOW_SM : "none",
                          borderRadius: "var(--dash-radius-sm, 16px)",
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

              {/* Active drill-down filter pills */}
              <ActiveFilterPills filters={drillFilters} onRemove={removeDrillFilter} onClearAll={() => setDrillFilters({})} />

              {/* Sections */}
              {!isCfoView && !isAgenticView && sectionsToRender.map((section, idx) => (
                <SectionBlock key={section.id} section={section} drillFilters={drillFilters} onDrillDown={toggleDrillFilter} isFirstSection={idx === 0} />
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
                    className="px-4 py-3 flex items-start gap-3"
                    style={{
                      background: "var(--dash-surface-variant, var(--dash-surface, #E0E5EC))",
                      color: "var(--dash-on-surface, #3D4852)",
                      boxShadow: "var(--dash-inset-shadow, none)",
                      border: "var(--dash-card-border, none)",
                      borderRadius: "var(--dash-radius-sm, 16px)",
                    }}
                  >
                    <Rocket className="h-5 w-5 shrink-0 mt-0.5 opacity-80" />
                    <div>
                      <p className="text-sm font-bold">Work in Progress</p>
                      <p className="text-xs opacity-80 mt-0.5">
                        Agentic workforce capabilities are being developed and will evolve. The agents listed below represent a proposed AI-augmented operating model for this role.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.agenticWorkforce?.map((agent, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div
                            className="p-5 space-y-2 transition-all duration-300 ease-out hover:-translate-y-0.5 cursor-default"
                            style={{
                              background: "var(--dash-surface, #E0E5EC)",
                              boxShadow: "var(--dash-card-shadow, none)",
                              border: "var(--dash-card-border, none)",
                              borderRadius: "var(--dash-radius, 32px)",
                            }}
                          >
                            <h4 className="font-bold text-sm" style={{ color: "var(--dash-on-surface, #3D4852)" }}>{agent.name}</h4>
                            <p className="text-xs line-clamp-2" style={{ color: "var(--dash-on-surface-muted, #6B7280)" }}>{agent.coreFunctionality}</p>
                            <p className="text-xs italic" style={{ color: "var(--dash-on-surface-muted, #6B7280)", opacity: 0.7 }}>Teams: {agent.interfacingTeams}</p>
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
              <footer className="pt-4 mt-8 text-center text-xs" style={{ color: "var(--dash-on-surface, #6B7280)", opacity: 0.5 }}>
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
