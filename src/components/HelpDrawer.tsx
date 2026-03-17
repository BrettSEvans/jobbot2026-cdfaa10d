import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Search, Lightbulb, ListChecks, Link2 } from "lucide-react";

interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tips: string[];
  keywords: string[];
  routes: string[];
  related: string[];
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: "applications-list",
    title: "Applications List",
    summary: "View all your job applications in one place. Each card shows the company, role, status, and creation date.",
    steps: [
      "Browse existing applications on the main page",
      "Click any application card to view its details",
      'Click "+ New Application" to create a new job application',
      "Switch to the Pipeline tab to see applications in a Kanban board by stage",
    ],
    tips: [
      "Applications show their generation status so you know when materials are ready",
      "Completed applications have all materials generated and available for download",
      "Drag and drop cards in Pipeline view to move applications between stages",
    ],
    keywords: ["applications", "list", "cards", "browse"],
    routes: ["/", "/applications"],
    related: ["new-application", "application-detail", "pipeline"],
  },
  {
    id: "new-application",
    title: "New Application",
    summary: "Create a new application by pasting a job listing URL. ResuVibe scrapes the job details and generates tailored materials.",
    steps: [
      'Click "+ New Application" from the Applications page',
      "Paste the job listing URL into the input field",
      "Click Submit — the system scrapes and begins generating materials",
      "Monitor progress via the background generation banner",
    ],
    tips: [
      "Use Batch Mode to paste up to 5 URLs at once",
      "Generation continues in the background even if you navigate away",
      "Blocked sites are tracked — you'll be warned if a URL can't be scraped",
    ],
    keywords: ["new", "create", "url", "paste", "batch", "scrape"],
    routes: ["/applications/new"],
    related: ["applications-list", "batch-mode", "background-jobs"],
  },
  {
    id: "application-detail",
    title: "Application Detail",
    summary: "View all generated materials for a job application — Resume, Cover Letter, and Industry Materials in a unified tab strip.",
    steps: [
      "Use the tab strip to switch between Resume, Cover Letter, and Industry Materials",
      'Click "Download PDF" to export any document',
      'Click "Vibe Edit" to refine a document with natural language instructions',
      "Use the ⋯ menu for Edit HTML, Regenerate, Copy Text, Revision History, Save as Template",
    ],
    tips: [
      "The action bar sticks to the top as you scroll",
      "Download PDF is always the most prominent action",
      "Revision history is saved automatically with every generation and refinement",
    ],
    keywords: ["detail", "resume", "cover letter", "materials", "download", "pdf", "vibe edit"],
    routes: ["/applications/"],
    related: ["resume", "cover-letter", "vibe-edit", "revision-history"],
  },
  {
    id: "pipeline",
    title: "Pipeline (Kanban Board)",
    summary: "A drag-and-drop board showing applications by stage: Created, Applied, Interviewing, Offer, Accepted, Withdrawn, Ghosted, Rejected.",
    steps: [
      'Click the "Pipeline" tab on the Applications page',
      "Drag application cards between columns to move them through stages",
      "Illogical transitions trigger a warning",
      "Stale applications (48+ hours) trigger a one-time status update reminder",
    ],
    tips: [
      'New applications default to the "Bookmarked" stage',
      "You can change stage from the detail page using the stage dropdown",
      "Pipeline analytics show conversion rates and time-in-stage metrics",
    ],
    keywords: ["pipeline", "kanban", "drag", "stages", "board"],
    routes: ["/"],
    related: ["applications-list"],
  },
  {
    id: "profile",
    title: "Profile & Preferences",
    summary: "Manage your name, resume text, key skills, target industries, preferred tone, and master cover letter.",
    steps: [
      "Navigate to Profile from the navigation bar",
      "Update your name, experience, and skills",
      "Upload or paste your resume text",
      "Set a master cover letter as a reusable base",
    ],
    tips: [
      "Key skills and target industries personalize your generated documents",
      "Preferred tone affects AI-generated writing style",
      "Resume text is used as context for all document generation",
    ],
    keywords: ["profile", "name", "skills", "industries", "resume", "preferences", "tone"],
    routes: ["/profile"],
    related: ["onboarding", "resume"],
  },
  {
    id: "vibe-edit",
    title: "Vibe Edit",
    summary: "Refine any generated document by describing changes in natural language — like chatting with an AI editor.",
    steps: [
      'Click "Vibe Edit" on any document\'s action bar',
      "Type your refinement instructions in the text field",
      "Submit — the AI applies your changes while preserving formatting",
      "Review the result; repeat for further refinements",
    ],
    tips: [
      'Be specific: "Make the tone more confident" works better than "Change it"',
      "Each refinement creates a new revision you can roll back to",
      "Vibe Edit works on Resume, Cover Letter, and Industry Materials",
    ],
    keywords: ["vibe", "edit", "refine", "natural language", "chat", "ai"],
    routes: ["/applications/"],
    related: ["application-detail", "revision-history"],
  },
  {
    id: "templates",
    title: "Templates",
    summary: "Save and reuse document templates across applications. Templates capture layout and structure for consistent quality.",
    steps: [
      "Navigate to Templates from the nav bar",
      "Browse saved templates by type (Dashboard, Resume, etc.)",
      'Use "Save as Template" from any document\'s action menu',
      "Apply a template when creating or refining documents",
    ],
    tips: [
      "Global templates are shared across all users (admin-created)",
      "Personal templates are private to your account",
      "Templates preserve layout and structure but adapt content to each job",
    ],
    keywords: ["templates", "save", "reuse", "layout"],
    routes: ["/templates"],
    related: ["application-detail"],
  },
  {
    id: "admin",
    title: "Admin Panel",
    summary: "Manage user approvals, system settings, and configuration. Visible only to admin users.",
    steps: [
      "Navigate to Admin from the navigation bar (admin role required)",
      "Use the Approvals tab to review pending users",
      "Approve or reject users to control access",
    ],
    tips: [
      "Campaign-based auto-approval can be configured for marketing UTM links",
      "Rejected users cannot sign in until re-approved",
    ],
    keywords: ["admin", "approvals", "users", "management"],
    routes: ["/admin"],
    related: [],
  },
];

export function HelpDrawer() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { pathname } = useLocation();

  const contextualTopics = useMemo(() => {
    return HELP_TOPICS.filter((t) =>
      t.routes.some((r) => pathname === r || (r.endsWith("/") && pathname.startsWith(r)))
    );
  }, [pathname]);

  const filteredTopics = useMemo(() => {
    if (!search.trim()) return HELP_TOPICS;
    const q = search.toLowerCase();
    return HELP_TOPICS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.includes(q))
    );
  }, [search]);

  const defaultExpanded = contextualTopics.length > 0 ? [contextualTopics[0].id] : [];

  const topicById = (id: string) => HELP_TOPICS.find((t) => t.id === id);

  return (
    <>
      {/* Floating Help button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => { setOpen(true); setSearch(""); }}
        className="fixed bottom-4 left-4 z-50 h-10 w-10 rounded-full shadow-lg bg-background border-border hover:bg-primary/10"
        aria-label="Help"
      >
        <HelpCircle className="h-5 w-5 text-primary" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-80 sm:w-96 p-0 flex flex-col bg-background">
          <SheetHeader className="p-4 border-b border-border shrink-0 space-y-3">
            <SheetTitle className="text-base">Help & Docs</SheetTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search topics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTopics.length} topic{filteredTopics.length !== 1 ? "s" : ""}
              {contextualTopics.length > 0 && !search && ` · ${contextualTopics.length} relevant to this page`}
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-auto p-4">
            <Accordion type="multiple" defaultValue={defaultExpanded}>
              {filteredTopics.map((topic) => {
                const isContextual = contextualTopics.some((c) => c.id === topic.id);
                return (
                  <AccordionItem key={topic.id} value={topic.id}>
                    <AccordionTrigger className="text-sm hover:no-underline py-3">
                      <div className="flex items-center gap-2 text-left">
                        <span className="font-medium">{topic.title}</span>
                        {isContextual && !search && (
                          <Badge variant="secondary" className="text-[10px] py-0">This page</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm pb-4">
                      <p className="text-muted-foreground">{topic.summary}</p>

                      {topic.steps.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <ListChecks className="h-3.5 w-3.5" /> Steps
                          </div>
                          <ol className="list-decimal list-inside space-y-0.5 text-xs text-muted-foreground pl-1">
                            {topic.steps.map((s, i) => <li key={i}>{s}</li>)}
                          </ol>
                        </div>
                      )}

                      {topic.tips.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Lightbulb className="h-3.5 w-3.5" /> Tips
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground pl-1">
                            {topic.tips.map((t, i) => <li key={i}>{t}</li>)}
                          </ul>
                        </div>
                      )}

                      {topic.related.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Link2 className="h-3.5 w-3.5" /> Related
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {topic.related.map((r) => {
                              const rel = topicById(r);
                              return rel ? (
                                <Badge
                                  key={r}
                                  variant="outline"
                                  className="text-[10px] cursor-pointer hover:bg-primary/10"
                                  onClick={() => setSearch(rel.title)}
                                >
                                  {rel.title}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
