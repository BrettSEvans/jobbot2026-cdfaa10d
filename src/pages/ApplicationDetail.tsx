import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowLeft, Loader2, ClipboardList, Shield, Network, Map,
  Info, FileText, LayoutDashboard, Mail,
} from "lucide-react";
import { useApplicationDetail } from "@/hooks/useApplicationDetail";
import { streamExecutiveReport } from "@/lib/api/executiveReport";
import { streamRaidLog } from "@/lib/api/raidLog";
import { streamArchitectureDiagram } from "@/lib/api/architectureDiagram";
import { streamRoadmap } from "@/lib/api/roadmap";
import { saveExecutiveReportRevision } from "@/lib/api/executiveReportRevisions";
import { saveRaidLogRevision } from "@/lib/api/raidLogRevisions";
import { saveArchitectureDiagramRevision } from "@/lib/api/architectureDiagramRevisions";
import { saveRoadmapRevision } from "@/lib/api/roadmapRevisions";
import DashboardTab from "@/components/tabs/DashboardTab";
import CoverLetterTab from "@/components/tabs/CoverLetterTab";
import HtmlAssetTab from "@/components/tabs/HtmlAssetTab";
import JobDescriptionTab from "@/components/tabs/JobDescriptionTab";
import DetailsTab from "@/components/tabs/DetailsTab";

type ActiveView =
  | "dashboard"
  | "cover-letter"
  | "executive-report"
  | "raid-log"
  | "architecture"
  | "roadmap";

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useApplicationDetail(id);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");

  if (state.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!state.app) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Application not found.</p>
        <Button variant="outline" onClick={() => navigate("/applications")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const primaryTabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "cover-letter" as const, label: "Cover Letter", icon: Mail },
  ];

  const advancedAssets = [
    {
      id: "executive-report" as const,
      label: "Executive Report",
      icon: ClipboardList,
      dbField: "executive_report_html" as const,
      html: state.executiveReportHtml,
      setHtml: state.setExecutiveReportHtml,
      generateFn: streamExecutiveReport,
      saveRevisionFn: saveExecutiveReportRevision,
      placeholder: 'e.g. "Add a risk mitigation section"',
      hasContent: !!state.executiveReportHtml,
    },
    {
      id: "raid-log" as const,
      label: "RAID Log",
      icon: Shield,
      dbField: "raid_log_html" as const,
      html: state.raidLogHtml,
      setHtml: state.setRaidLogHtml,
      generateFn: streamRaidLog,
      saveRevisionFn: saveRaidLogRevision,
      placeholder: 'e.g. "Add a new risk about vendor lock-in"',
      hasContent: !!state.raidLogHtml,
    },
    {
      id: "architecture" as const,
      label: "Architecture",
      icon: Network,
      dbField: "architecture_diagram_html" as const,
      html: state.archDiagramHtml,
      setHtml: state.setArchDiagramHtml,
      generateFn: streamArchitectureDiagram,
      saveRevisionFn: saveArchitectureDiagramRevision,
      placeholder: 'e.g. "Add a caching layer"',
      hasContent: !!state.archDiagramHtml,
    },
    {
      id: "roadmap" as const,
      label: "Roadmap",
      icon: Map,
      dbField: "roadmap_html" as const,
      html: state.roadmapHtml,
      setHtml: state.setRoadmapHtml,
      generateFn: streamRoadmap,
      saveRevisionFn: saveRoadmapRevision,
      placeholder: 'e.g. "Extend the timeline to 4 quarters"',
      hasContent: !!state.roadmapHtml,
    },
  ];

  const isPrimary = activeView === "dashboard" || activeView === "cover-letter";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-heading">
                {state.companyName || "Unknown Company"} — {state.jobTitle || "Unknown Role"}
              </h1>
              <p className="text-xs text-muted-foreground truncate max-w-md">{state.app.job_url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Info className="h-4 w-4 mr-1.5" /> Info
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle className="font-heading">Application Details</SheetTitle>
                </SheetHeader>
                <div className="space-y-6">
                  <DetailsTab state={state} />
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" /> Job Description
                    </h3>
                    <JobDescriptionTab state={state} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Badge variant={state.app.status === "complete" ? "default" : "secondary"}>{state.app.status}</Badge>
          </div>
        </div>

        {/* Primary Tab Triggers */}
        <div className="flex gap-1 border-b border-border pb-0">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeView === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Advanced Reports Bar */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Advanced Reports</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {advancedAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setActiveView(asset.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                  activeView === asset.id
                    ? "border-primary bg-primary/5 text-foreground shadow-sm"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/50"
                }`}
              >
                <asset.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{asset.label}</span>
                <div
                  className={`h-2 w-2 rounded-full shrink-0 ml-auto ${
                    asset.hasContent ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  title={asset.hasContent ? "Generated" : "Not generated"}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div>
          {activeView === "dashboard" && (
            <DashboardTab appId={id!} state={state} />
          )}
          {activeView === "cover-letter" && (
            <CoverLetterTab appId={id!} state={state} />
          )}
          {advancedAssets.map((a) =>
            activeView === a.id ? (
              <HtmlAssetTab
                key={a.id}
                appId={id!}
                state={state}
                assetType={a.id as any}
                label={a.label}
                dbField={a.dbField}
                html={a.html}
                setHtml={a.setHtml}
                generateFn={a.generateFn}
                saveRevisionFn={a.saveRevisionFn}
                emptyIcon={a.icon}
                refinePlaceholder={a.placeholder}
              />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetail;
