/**
 * JSON schema for LLM-generated dashboard data.
 * The LLM outputs this structure; fixed templates render it.
 */

export interface DashboardData {
  meta: DashboardMeta;
  branding: DashboardBranding;
  navigation: NavItem[];
  sections: DashboardSection[];
  agenticWorkforce: AgenticAgent[];
  cfoScenarios: CFOScenario[];
  globalFilters?: GlobalFilter[];
  candidate?: DashboardCandidate;
  footer?: DashboardFooter;
}

export interface DashboardMeta {
  companyName: string;
  jobTitle: string;
  department: string;
  logoUrl?: string;
}

export interface DashboardBranding {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  outline: string;
  error: string;
  fontHeading: string;
  fontBody: string;
  background?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string; // Material Icons Outlined name
}

export interface DashboardSection {
  id: string;
  title: string;
  description: string;
  navId?: string; // links section to a NavItem.id
  layout?: "default" | "kpi-spotlight" | "split-panel" | "full-width-timeline" | "grid-cards" | "map-table";
  metrics?: MetricItem[];
  charts?: ChartConfig[];
  tables?: TableConfig[];
}

export interface MetricItem {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

export interface ChartConfig {
  id: string;
  title: string;
  type:
    | "bar"
    | "line"
    | "doughnut"
    | "pie"
    | "radar"
    | "scatter"
    | "horizontalBar"
    | "area"
    | "gantt"
    | "heatmap"
    | "treemap"
    | "waterfall"
    | "funnel";
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  indexAxis?: "x" | "y";
}

export interface ChartDataset {
  label: string;
  data: number[] | number[][];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  borderRadius?: number;
  fill?: boolean;
  tension?: number;
}

export interface TableConfig {
  id: string;
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows?: Array<Record<string, any>>;
  generateRows?: {
    count: number;
    seed?: number;
    fields: Record<string, FieldGenerator>;
  };
}

export interface FieldGenerator {
  type:
    | "personName"
    | "company"
    | "date"
    | "futureDate"
    | "currency"
    | "status"
    | "region"
    | "product"
    | "percent"
    | "integer"
    | "email"
    | "pick";
  options?: string[];
  min?: number;
  max?: number;
  maxDays?: number;
}

export interface AgenticAgent {
  name: string;
  coreFunctionality: string;
  interfacingTeams: string;
}

export interface CFOScenario {
  id: string;
  title: string;
  description: string;
  type: "pricing" | "headcount" | "expansion";
  sliders: SliderConfig[];
  baseline: Record<string, number>;
  quarters: string[];
  chartType?: "line" | "bar";
  currencyFormat?: boolean;
}

export interface SliderConfig {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
  controlType?: "slider" | "toggle" | "segmented";
  options?: Array<{ label: string; value: number }>;
}

export interface GlobalFilter {
  id: string;
  label: string;
  type: "dropdown" | "segmented" | "chips";
  options: string[];
}

export interface DashboardCandidate {
  name: string;
  photoUrl?: string;
  tagline: string;
  linkedIn?: string;
  portfolio?: string;
}

export interface DashboardFooter {
  text?: string;
  showBranding?: boolean;
}
