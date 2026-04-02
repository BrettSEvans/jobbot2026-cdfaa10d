import { useState } from "react";
import type { DashboardData, DashboardSection } from "@/lib/dashboard/schema";
import KpiCard from "./KpiCard";
import ChartBlock from "./ChartBlock";
import DataTable from "./DataTable";
import ScenarioPanel from "./ScenarioPanel";
import FilterBar from "./FilterBar";

interface DashboardRendererProps {
  data: DashboardData;
}

function SectionBlock({ section }: { section: DashboardSection }) {
  const hasMetrics = section.metrics && section.metrics.length > 0;
  const hasCharts = section.charts && section.charts.length > 0;
  const hasTables = section.tables && section.tables.length > 0;

  // Determine grid layout based on layout mode
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
        <h3 className="text-lg font-bold text-foreground">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
        )}
      </div>

      {/* KPIs */}
      {hasMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {section.metrics!.map((m, i) => (
            <KpiCard key={i} metric={m} />
          ))}
        </div>
      )}

      {/* Charts */}
      {hasCharts && (
        <div className={`grid ${chartGrid()} gap-4`}>
          {section.charts!.map((c) => (
            <ChartBlock key={c.id} config={c} />
          ))}
        </div>
      )}

      {/* Tables */}
      {hasTables && (
        <div className="space-y-4">
          {section.tables!.map((t) => (
            <DataTable key={t.id} config={t} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardRenderer({ data }: DashboardRendererProps) {
  const [activeNav, setActiveNav] = useState(data.navigation?.[0]?.id || "");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const handleFilterChange = (id: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {data.meta.companyName} — {data.meta.jobTitle}
            </h1>
            <p className="text-xs text-muted-foreground">{data.meta.department}</p>
          </div>
        </div>

        {/* Navigation */}
        {data.navigation?.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 pb-2">
            <nav className="flex gap-1 overflow-x-auto">
              {data.navigation.map((nav) => (
                <button key={nav.id}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    activeNav === nav.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
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
        {/* Global filters */}
        {data.globalFilters && data.globalFilters.length > 0 && (
          <FilterBar
            filters={data.globalFilters}
            values={filterValues}
            onChange={handleFilterChange}
          />
        )}

        {/* Sections */}
        {data.sections.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}

        {/* CFO Scenarios */}
        {data.cfoScenarios?.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Scenario Analysis</h3>
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
            <h3 className="text-lg font-bold text-foreground">AI-Powered Workforce</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.agenticWorkforce.map((agent, i) => (
                <div key={i} className="bg-card border rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm text-card-foreground">{agent.name}</h4>
                  <p className="text-xs text-muted-foreground">{agent.coreFunctionality}</p>
                  <p className="text-xs text-muted-foreground italic">Teams: {agent.interfacingTeams}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Built with ResuVibe
      </footer>
    </div>
  );
}
