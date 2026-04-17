/**
 * Dashboard Style Families
 * --------------------------------------------------
 * Each family is a complete, mutually exclusive visual identity.
 * AI selects ONE per dashboard; mixing is forbidden by design.
 *
 * Inspired by Justinmind dashboard-design-best-practices guidance:
 *  - Strong hierarchy (F/Z reading pattern)
 *  - 5–6 cards per section max
 *  - Generous whitespace, clear separation between regions
 *  - Cards adapt their elevation to the surrounding canvas
 */

export type StyleFamily =
  | "neumorphic-soft"
  | "crisp-analytics"
  | "editorial-minimal"
  | "data-dense-pro";

export interface StyleFamilyTokens {
  /** Canvas background behind every card. */
  background: string;
  /** Card surface color. */
  surface: string;
  /** Slight variant for sidebar / nested surfaces. */
  surfaceVariant: string;
  /** Primary text color for cards. */
  onSurface: string;
  /** Muted secondary text. */
  onSurfaceMuted: string;
  /** Card outer radius (px). */
  radius: number;
  /** Card inner radius (px) for chips/pills. */
  radiusSmall: number;
  /** Standard card box-shadow. */
  cardShadow: string;
  /** Elevated/hover card shadow. */
  cardShadowHover: string;
  /** Inset (recessed) shadow for description blocks. */
  insetShadow: string;
  /** Optional border (used by flat families). "none" disables. */
  cardBorder: string;
  /** Sidebar background. */
  sidebarBackground: string;
  /** Header gradient — receives primary/primaryContainer at runtime. */
  headerStyle: "gradient" | "flat" | "minimal";
  /** Density of the layout — affects card padding & metric card height. */
  density: "comfortable" | "compact" | "editorial";
  /** Use monospaced numerals on KPIs (data-dense). */
  monoNumerals: boolean;
  /** Use uppercase + tracking on labels. */
  uppercaseLabels: boolean;
  /** Default heading font fallback. */
  fontHeading: string;
  /** Default body font fallback. */
  fontBody: string;
}

export const STYLE_FAMILIES: Record<StyleFamily, StyleFamilyTokens> = {
  /**
   * NEUMORPHIC SOFT — current default
   * Cool grey canvas, dual opposing shadows, tactile depth.
   */
  "neumorphic-soft": {
    background: "#E0E5EC",
    surface: "#E0E5EC",
    surfaceVariant: "#D8DEE6",
    onSurface: "#3D4852",
    onSurfaceMuted: "#6B7280",
    radius: 32,
    radiusSmall: 16,
    cardShadow: "9px 9px 16px rgba(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)",
    cardShadowHover: "12px 12px 20px rgba(163,177,198,0.7), -12px -12px 20px rgba(255,255,255,0.6)",
    insetShadow: "inset 6px 6px 10px rgba(163,177,198,0.6), inset -6px -6px 10px rgba(255,255,255,0.5)",
    cardBorder: "none",
    sidebarBackground: "#D8DEE6",
    headerStyle: "gradient",
    density: "comfortable",
    monoNumerals: false,
    uppercaseLabels: true,
    fontHeading: "Plus Jakarta Sans",
    fontBody: "DM Sans",
  },

  /**
   * CRISP ANALYTICS — modern SaaS look
   * White cards on light canvas, 1px subtle border + soft drop shadow.
   * Reference: Stripe, Linear, modern Justinmind examples.
   */
  "crisp-analytics": {
    background: "#F7F8FA",
    surface: "#FFFFFF",
    surfaceVariant: "#FFFFFF",
    onSurface: "#0F172A",
    onSurfaceMuted: "#64748B",
    radius: 16,
    radiusSmall: 10,
    cardShadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.05)",
    cardShadowHover: "0 4px 8px rgba(15,23,42,0.06), 0 12px 28px rgba(15,23,42,0.08)",
    insetShadow: "none",
    cardBorder: "1px solid rgba(15,23,42,0.08)",
    sidebarBackground: "#FFFFFF",
    headerStyle: "flat",
    density: "comfortable",
    monoNumerals: false,
    uppercaseLabels: false,
    fontHeading: "Inter",
    fontBody: "Inter",
  },

  /**
   * EDITORIAL MINIMAL — magazine-style
   * Off-white canvas, no borders, generous padding, bold serif-friendly type.
   * Reference: Bloomberg, NYT-style executive dashboards.
   */
  "editorial-minimal": {
    background: "#FAFAF7",
    surface: "#FFFFFF",
    surfaceVariant: "#F4F4EE",
    onSurface: "#1A1A1A",
    onSurfaceMuted: "#737373",
    radius: 4,
    radiusSmall: 2,
    cardShadow: "none",
    cardShadowHover: "0 2px 8px rgba(0,0,0,0.04)",
    insetShadow: "none",
    cardBorder: "1px solid rgba(0,0,0,0.06)",
    sidebarBackground: "#F4F4EE",
    headerStyle: "minimal",
    density: "editorial",
    monoNumerals: false,
    uppercaseLabels: true,
    fontHeading: "Playfair Display",
    fontBody: "Inter",
  },

  /**
   * DATA-DENSE PRO — enterprise / finance
   * Light grey canvas, compact cards, monospaced numerals, high info density.
   * Reference: Bloomberg Terminal Lite, finance trading dashboards.
   */
  "data-dense-pro": {
    background: "#F1F3F5",
    surface: "#FFFFFF",
    surfaceVariant: "#F8F9FA",
    onSurface: "#212529",
    onSurfaceMuted: "#6C757D",
    radius: 8,
    radiusSmall: 4,
    cardShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    cardShadowHover: "0 4px 6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)",
    insetShadow: "none",
    cardBorder: "1px solid rgba(0,0,0,0.06)",
    sidebarBackground: "#F8F9FA",
    headerStyle: "flat",
    density: "compact",
    monoNumerals: true,
    uppercaseLabels: true,
    fontHeading: "IBM Plex Sans",
    fontBody: "IBM Plex Sans",
  },
};

export const DEFAULT_STYLE_FAMILY: StyleFamily = "neumorphic-soft";

/** Resolve a possibly-unknown style family string to a known one. */
export function resolveStyleFamily(value: string | undefined | null): StyleFamily {
  if (value && value in STYLE_FAMILIES) return value as StyleFamily;
  return DEFAULT_STYLE_FAMILY;
}

/** Get the token bundle for a family (with fallback). */
export function getStyleFamilyTokens(value: string | undefined | null): StyleFamilyTokens {
  return STYLE_FAMILIES[resolveStyleFamily(value)];
}

/**
 * Build CSS custom-properties object for a given family.
 * These vars are consumed by KpiCard, ChartBlock, DataTable, and DashboardRenderer.
 */
export function buildStyleFamilyVars(family: StyleFamily): Record<string, string | number> {
  const t = STYLE_FAMILIES[family];
  return {
    "--dash-bg": t.background,
    "--dash-surface": t.surface,
    "--dash-surface-variant": t.surfaceVariant,
    "--dash-on-surface": t.onSurface,
    "--dash-on-surface-muted": t.onSurfaceMuted,
    "--dash-radius": `${t.radius}px`,
    "--dash-radius-sm": `${t.radiusSmall}px`,
    "--dash-card-shadow": t.cardShadow,
    "--dash-card-shadow-hover": t.cardShadowHover,
    "--dash-inset-shadow": t.insetShadow,
    "--dash-card-border": t.cardBorder,
    "--dash-sidebar-bg": t.sidebarBackground,
    "--dash-mono-numerals": t.monoNumerals ? "'JetBrains Mono', 'IBM Plex Mono', monospace" : "inherit",
    "--dash-label-transform": t.uppercaseLabels ? "uppercase" : "none",
    "--dash-label-tracking": t.uppercaseLabels ? "0.05em" : "0",
  };
}
