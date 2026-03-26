import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Palette, LayoutGrid, TrendingUp } from "lucide-react";

interface DashboardCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  researchedSections: any[];
  researchedCfoScenarios: any[];
  scrapedBranding: any;
  onConfirm: (choices: {
    colors: { primary: string; secondary: string };
    selectedSections: any[];
    selectedCfoScenarios: any[];
  }) => void;
  onSkip: () => void;
}

export default function DashboardCustomizationDialog({
  open,
  onOpenChange,
  researchedSections,
  researchedCfoScenarios,
  scrapedBranding,
  onConfirm,
  onSkip,
}: DashboardCustomizationDialogProps) {
  // Colors
  const defaultPrimary = scrapedBranding?.colors?.primary || scrapedBranding?.extractedColors?.primary || "#0a8080";
  const defaultSecondary = scrapedBranding?.colors?.secondary || scrapedBranding?.extractedColors?.secondary || "#f45d48";
  const [primaryColor, setPrimaryColor] = useState(defaultPrimary);
  const [secondaryColor, setSecondaryColor] = useState(defaultSecondary);

  // Sections — pre-select first 6
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(
    () => new Set(researchedSections.slice(0, 6).map((s: any) => s.id))
  );

  // CFO scenarios — sort by rank, pre-select top 3
  const sortedScenarios = [...(researchedCfoScenarios || [])].sort(
    (a: any, b: any) => (a.relevanceRank || 99) - (b.relevanceRank || 99)
  );
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(
    () => new Set(sortedScenarios.slice(0, 3).map((s: any) => s.id))
  );

  const toggleSection = (id: string) => {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleScenario = (id: string) => {
    setSelectedScenarioIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm({
      colors: { primary: primaryColor, secondary: secondaryColor },
      selectedSections: researchedSections.filter((s: any) => selectedSectionIds.has(s.id)),
      selectedCfoScenarios: sortedScenarios.filter((s: any) => selectedScenarioIds.has(s.id)),
    });
  };

  const minSections = 5;
  const maxSections = 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Customize Your Dashboard
          </DialogTitle>
          <DialogDescription>
            Personalize your dashboard before generation. Pick brand colors, choose sections, and select CFO scenarios.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colors" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="colors" className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Colors
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> Sections
              <Badge variant="secondary" className="ml-1 text-[10px]">{selectedSectionIds.size}</Badge>
            </TabsTrigger>
            <TabsTrigger value="cfo" className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> CFO Scenarios
              <Badge variant="secondary" className="ml-1 text-[10px]">{selectedScenarioIds.size}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="flex-1 overflow-y-auto space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Choose two colors for the dashboard headers and framework. These are seeded from the company's branding.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <span className="text-sm font-mono text-muted-foreground">{primaryColor}</span>
                </div>
                <div className="h-8 rounded" style={{ backgroundColor: primaryColor }} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <span className="text-sm font-mono text-muted-foreground">{secondaryColor}</span>
                </div>
                <div className="h-8 rounded" style={{ backgroundColor: secondaryColor }} />
              </div>
            </div>
            {/* Preview swatch */}
            <div className="rounded-lg overflow-hidden border">
              <div className="h-10 flex items-center px-4 text-white text-sm font-medium" style={{ backgroundColor: primaryColor }}>
                Dashboard Header Preview
              </div>
              <div className="h-6" style={{ backgroundColor: secondaryColor, opacity: 0.15 }} />
            </div>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="flex-1 overflow-y-auto space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Select {minSections}–{maxSections} sections for your dashboard. The research agent recommended these based on the role.
            </p>
            <div className="space-y-2">
              {researchedSections.map((section: any) => (
                <div
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedSectionIds.has(section.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedSectionIds.has(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="material-icons-outlined text-base text-muted-foreground" style={{ fontFamily: 'Material Icons Outlined' }}>
                          {section.icon}
                        </span>
                        <p className="font-medium text-sm">{section.label}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{section.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* CFO Scenarios Tab */}
          <TabsContent value="cfo" className="flex-1 overflow-y-auto space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Select 3 CFO what-if scenarios. Ranked by relevance to the role — top picks are pre-selected.
            </p>
            <div className="space-y-2">
              {sortedScenarios.map((scenario: any, idx: number) => (
                <div
                  key={scenario.id}
                  onClick={() => toggleScenario(scenario.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedScenarioIds.has(scenario.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedScenarioIds.has(scenario.id)}
                      onCheckedChange={() => toggleScenario(scenario.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{scenario.title}</p>
                        {idx < 3 && (
                          <Badge variant="secondary" className="text-[10px]">Top pick</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] capitalize">{scenario.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scenario.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onSkip}>Skip — use defaults</Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedSectionIds.size < minSections || selectedScenarioIds.size === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
