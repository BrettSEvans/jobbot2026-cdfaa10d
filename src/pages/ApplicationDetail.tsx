import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, ClipboardList, Shield, Network, Map } from "lucide-react";
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

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useApplicationDetail(id);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {state.companyName || "Unknown Company"} — {state.jobTitle || "Unknown Role"}
              </h1>
              <p className="text-xs text-muted-foreground">{state.app.job_url}</p>
            </div>
          </div>
          <Badge variant={state.app.status === "complete" ? "default" : "secondary"}>{state.app.status}</Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
            <TabsTrigger value="executive-report">Executive Report</TabsTrigger>
            <TabsTrigger value="raid-log">RAID Log</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="job-description">Job Description</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab appId={id!} state={state} />
          </TabsContent>

          <TabsContent value="cover-letter">
            <CoverLetterTab appId={id!} state={state} />
          </TabsContent>

          <TabsContent value="executive-report">
            <HtmlAssetTab
              appId={id!} state={state} assetType="executive-report" label="Executive Report"
              dbField="executive_report_html" html={state.executiveReportHtml} setHtml={state.setExecutiveReportHtml}
              generateFn={streamExecutiveReport} saveRevisionFn={saveExecutiveReportRevision}
              emptyIcon={ClipboardList} refinePlaceholder='e.g. "Add a risk mitigation section"'
            />
          </TabsContent>

          <TabsContent value="raid-log">
            <HtmlAssetTab
              appId={id!} state={state} assetType="raid-log" label="RAID Log"
              dbField="raid_log_html" html={state.raidLogHtml} setHtml={state.setRaidLogHtml}
              generateFn={streamRaidLog} saveRevisionFn={saveRaidLogRevision}
              emptyIcon={Shield} refinePlaceholder='e.g. "Add a new risk about vendor lock-in"'
            />
          </TabsContent>

          <TabsContent value="architecture">
            <HtmlAssetTab
              appId={id!} state={state} assetType="architecture-diagram" label="Architecture Diagram"
              dbField="architecture_diagram_html" html={state.archDiagramHtml} setHtml={state.setArchDiagramHtml}
              generateFn={streamArchitectureDiagram} saveRevisionFn={saveArchitectureDiagramRevision}
              emptyIcon={Network} refinePlaceholder='e.g. "Add a caching layer"'
            />
          </TabsContent>

          <TabsContent value="roadmap">
            <HtmlAssetTab
              appId={id!} state={state} assetType="roadmap" label="Roadmap"
              dbField="roadmap_html" html={state.roadmapHtml} setHtml={state.setRoadmapHtml}
              generateFn={streamRoadmap} saveRevisionFn={saveRoadmapRevision}
              emptyIcon={Map} refinePlaceholder='e.g. "Extend the timeline to 4 quarters"'
            />
          </TabsContent>

          <TabsContent value="job-description">
            <JobDescriptionTab state={state} />
          </TabsContent>

          <TabsContent value="details">
            <DetailsTab state={state} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApplicationDetail;
