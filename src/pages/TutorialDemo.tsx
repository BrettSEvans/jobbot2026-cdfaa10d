import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, FileText, LayoutDashboard, Mail, FileUser, ArrowLeftRight,
  Download, RotateCcw, Sparkles,
} from "lucide-react";
import {
  demoDashboardHtml,
  demoCoverLetterHtml,
  demoResumeHtml,
  demoIndustryAssets,
} from "@/lib/tutorial/demoContent";

type ActiveView = "dashboard" | "cover-letter" | "resume" | string;

/**
 * Read-only mock of ApplicationDetail for the tutorial demo mode.
 * Renders static demo content with the same data-tutorial attributes
 * so the spotlight & bubble positioning work identically to the real page.
 */
export default function TutorialDemo() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");

  const primaryTabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "cover-letter" as const, label: "Cover Letter", icon: Mail },
    { id: "resume" as const, label: "Resume", icon: FileUser },
  ];

  const isPrimaryView = ["dashboard", "cover-letter", "resume"].includes(activeView);
  const activeDynamic = demoIndustryAssets.find((a) => a.id === activeView);

  const getHtml = () => {
    if (activeView === "dashboard") return demoDashboardHtml;
    if (activeView === "cover-letter") return demoCoverLetterHtml;
    if (activeView === "resume") return demoResumeHtml;
    if (activeDynamic) return activeDynamic.html;
    return "";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" disabled>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-heading">
                Acme Corp — Senior Product Manager
              </h1>
              <p className="text-xs text-muted-foreground">Demo Application · Tutorial Mode</p>
            </div>
          </div>
          <Badge variant="default">complete</Badge>
        </div>

        {/* Primary Tab Triggers */}
        <div data-tutorial="asset-tabs" className="flex items-center gap-1 border-b border-border pb-0">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              data-tutorial={`${tab.id}-tab`}
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

        {/* Dynamic Assets Bar */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Industry Assets
          </span>
          <div data-tutorial="industry-assets-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {demoIndustryAssets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveView(asset.id)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                    activeView === asset.id
                      ? "border-primary bg-primary/5 text-foreground shadow-sm"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/50"
                  }`}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{asset.title}</span>
                  <div className="h-2 w-2 rounded-full shrink-0 ml-auto bg-primary" title="complete" />
                </button>
                <Button data-tutorial="change-asset-btn" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Change asset type" disabled>
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {/* Action buttons row */}
          <div className="flex items-center gap-2">
            <Button data-tutorial="generate-btn" variant="outline" size="sm" disabled>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Regenerate
            </Button>
            <Button data-tutorial="refine-ai-btn" variant="outline" size="sm" disabled>
              <Sparkles className="h-4 w-4 mr-1.5" /> Vibe Edit
            </Button>
            <Button data-tutorial="download-btn" variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-1.5" /> Download PDF
            </Button>
          </div>

          {/* Rendered content */}
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div
              className="p-4"
              dangerouslySetInnerHTML={{ __html: getHtml() }}
            />
          </div>

          {/* Mock revision history */}
          <div data-tutorial="revision-history" className="border border-border rounded-lg p-4 bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">Revision History</h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground py-1 px-2 rounded bg-background">
                <span>v1 — Initial generation</span>
                <span className="text-xs">Just now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
