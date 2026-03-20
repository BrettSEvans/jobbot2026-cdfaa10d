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
    summary: "View all your job applications in one place. Each row shows the company, role, status, and creation date.",
    steps: [
      "Browse existing applications on the main page",
      "Click any application row to view its details",
      'Click "+ New Application" to create a new job application',
      "Use the Retry button on errored applications to restart generation",
    ],
    tips: [
      "Applications show their generation status so you know when materials are ready",
      "Hover over an Error badge to see what went wrong",
      "Delete requires confirmation — no accidental deletions",
      "If your profile is missing resume text, a banner will nudge you to complete it",
      "Date columns are hidden on mobile for a cleaner view",
    ],
    keywords: ["applications", "list", "cards", "browse", "retry", "delete"],
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
    summary: "View all generated materials for a job application across five tabs: Resume, Cover Letter, JD Analysis, Dashboard, and Details.",
    steps: [
      "Use the tab strip to switch between Resume, Cover Letter, JD Analysis, Dashboard, and Details",
      "Use prev/next arrows in the header to navigate between applications sequentially",
      'Click "Download HTML" or "Copy HTML" to export any document',
      "Use the ⋯ actions for Regenerate, Copy, Revision History, Save as Template",
    ],
    tips: [
      "The Resume tab is the default — it shows your optimized resume and all resume tools",
      "Use the prev/next arrows to quickly review multiple applications without going back to the list",
      "Revision history is saved automatically with every generation and refinement",
    ],
    keywords: ["detail", "resume", "cover letter", "materials", "download", "tabs", "prev", "next"],
    routes: ["/applications/"],
    related: ["resume-tab", "cover-letter", "jd-analysis", "dashboard-tab"],
  },
  {
    id: "resume-tab",
    title: "Resume Tab",
    summary: "View your AI-optimized resume with keyword injection, diff viewer, ATS compliance checker, and bullet coach — all in one place.",
    steps: [
      "Navigate to the Resume tab on any application",
      "View the generated resume in the iframe preview",
      "Use Keyword Gap Analysis to identify missing keywords and inject them",
      "Review the Resume Diff to see what changed vs. your baseline",
      "Check ATS Format Compliance for formatting issues",
      "Use Bullet Coach for XYZ-format improvements",
    ],
    tips: [
      "If no resume exists yet, the tab guides you through generating one",
      "You need resume text in your Profile for keyword analysis to work",
      "Download or Copy the resume HTML for use in external tools",
    ],
    keywords: ["resume", "optimize", "keyword", "ats", "diff", "bullet"],
    routes: ["/applications/"],
    related: ["keyword-analysis", "resume-diff", "ats-compliance", "bullet-coach"],
  },
  {
    id: "keyword-analysis",
    title: "Keyword Gap Analysis",
    summary: "AI extracts ATS-critical keywords from the job description and compares them against your resume to find gaps.",
    steps: [
      'Click "Analyze Keywords" on the Resume tab',
      "Wait for the AI to extract keywords from the job description",
      "Review matched vs. missing keywords with importance levels (critical, preferred, nice-to-have)",
      'Click "Optimize Resume" to auto-inject missing keywords into your resume',
    ],
    tips: [
      "Critical keywords appear first — prioritize adding these to your resume",
      "The match percentage shows your ATS compatibility score",
      "Keywords are matched with synonym awareness (e.g., 'JS' matches 'JavaScript')",
      "You need both a job description and resume text for this to work",
    ],
    keywords: ["keyword", "gap", "ats", "match", "optimize", "inject"],
    routes: ["/applications/"],
    related: ["resume-tab", "ats-compliance"],
  },
  {
    id: "resume-diff",
    title: "Resume Diff & Fabrication Review",
    summary: "Side-by-side comparison of your baseline resume vs. the AI-tailored version, with fabrication detection and trust scoring.",
    steps: [
      'Click "View Changes" on the Resume tab to run the diff',
      "Review color-coded changes: green (added), red (removed), amber (modified)",
      "Check the Trust Score gauge for potential fabrication flags",
      "Accept or Revert flagged changes — Revert actually restores your original text",
    ],
    tips: [
      "Accept keeps the AI change; Revert replaces it with your baseline text in the database",
      "The trust score reflects the ratio of verified vs. potentially fabricated claims",
      "Change types include keyword_injection, quantification, xyz_rewrite, and more",
    ],
    keywords: ["diff", "fabrication", "trust", "revert", "accept", "changes"],
    routes: ["/applications/"],
    related: ["resume-tab", "keyword-analysis"],
  },
  {
    id: "ats-compliance",
    title: "ATS Format Compliance",
    summary: "Checks your resume HTML for ATS-unfriendly formatting issues like tables, images, headers/footers, and complex CSS.",
    steps: [
      "Scroll down on the Resume tab to see the ATS Compliance section",
      "Review pass/fail checks for common formatting issues",
      "Fix flagged issues to improve your ATS pass-through rate",
    ],
    tips: [
      "ATS scanners struggle with tables, images, and multi-column layouts",
      "Plain HTML with semantic headings scores highest",
      "This check runs client-side — no AI credits used",
    ],
    keywords: ["ats", "format", "compliance", "check", "table", "image"],
    routes: ["/applications/"],
    related: ["resume-tab", "keyword-analysis"],
  },
  {
    id: "bullet-coach",
    title: "Bullet Coach",
    summary: "AI analyzes your resume bullets and suggests XYZ-format improvements (Accomplished X, as measured by Y, by doing Z).",
    steps: [
      "Scroll down on the Resume tab to see the Bullet Coach section",
      "Review weak bullets flagged by the AI",
      "Click Apply to replace a weak bullet with the improved version",
    ],
    tips: [
      "XYZ format is preferred by top recruiters and ATS systems",
      "Each fix is applied directly to your stored resume HTML",
      "Requires both a resume and job description for context-aware suggestions",
    ],
    keywords: ["bullet", "coach", "xyz", "improve", "quantify"],
    routes: ["/applications/"],
    related: ["resume-tab"],
  },
  {
    id: "jd-analysis",
    title: "JD Analysis Tab",
    summary: "Deep analysis of the job description — structured intelligence extraction and summary preview for interview prep.",
    steps: [
      "Navigate to the JD Analysis tab on any application",
      "Review JD Intelligence: requirements, seniority signals, culture keywords",
      "Check the Summary Preview for a tailored professional summary",
      "Edit the raw job description text if needed",
    ],
    tips: [
      "JD Intelligence categorizes requirements as must-have, preferred, or bonus",
      "Culture keywords are routed to cover letters; technical keywords to resumes",
      "If no JD is available, you'll see a prompt to add one",
    ],
    keywords: ["jd", "analysis", "intelligence", "summary", "requirements"],
    routes: ["/applications/"],
    related: ["application-detail", "keyword-analysis", "resume-tab"],
  },
  {
    id: "cover-letter",
    title: "Cover Letter",
    summary: "AI-generated cover letter tailored to the job description, using your master cover letter as a style reference.",
    steps: [
      "Navigate to the Cover Letter tab on any application",
      "Review the generated cover letter",
      "Click Edit to make manual changes, or Regenerate for a fresh version",
      "Use Copy to paste into application forms",
    ],
    tips: [
      "Set a master cover letter in your Profile to improve tone matching",
      "Regeneration saves the previous version as a revision automatically",
      "Browse revision history to compare and restore older versions",
    ],
    keywords: ["cover letter", "generate", "edit", "copy", "master"],
    routes: ["/applications/"],
    related: ["application-detail", "profile"],
  },
  {
    id: "dashboard-tab",
    title: "Dashboard Tab",
    summary: "A branded, interactive research dashboard with company analysis, market intelligence, and competitive landscape.",
    steps: [
      "Navigate to the Dashboard tab on any application",
      'Use "Refine with AI" to chat and request changes',
      "Download as ZIP for separate HTML/CSS/JS files, or as single HTML",
      'Click "Save as Template" to reuse the layout for future applications',
    ],
    tips: [
      "Dashboard generation uses company branding colors when available",
      "Refinement continues in the background if you navigate away",
      "Revision history tracks every refinement for easy rollback",
    ],
    keywords: ["dashboard", "refine", "download", "zip", "template"],
    routes: ["/applications/"],
    related: ["application-detail", "templates"],
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
      "Set a master cover letter as a reusable style reference",
    ],
    tips: [
      "Key skills and target industries personalize your generated documents",
      "Preferred tone affects AI-generated writing style",
      "Resume text is used as context for all document generation",
      "A profile completeness banner appears on the Applications page if resume text is missing",
    ],
    keywords: ["profile", "name", "skills", "industries", "resume", "preferences", "tone", "master cover letter"],
    routes: ["/profile"],
    related: ["onboarding", "resume-tab", "cover-letter"],
  },
  {
    id: "onboarding",
    title: "Onboarding Wizard",
    summary: "A 5-step setup wizard that collects your name, resume, skills, master cover letter, and gets you ready to go.",
    steps: [
      "Step 1: Enter your name and years of experience",
      "Step 2: Paste your resume text",
      "Step 3: Select key skills and target industries",
      "Step 4: (Optional) Paste your master cover letter for tone matching",
      "Step 5: Review and complete setup",
    ],
    tips: [
      "You can skip onboarding and complete your profile later",
      "The master cover letter step is optional but dramatically improves cover letter quality",
      "All onboarding data can be updated anytime from the Profile page",
    ],
    keywords: ["onboarding", "setup", "wizard", "new user", "master cover letter"],
    routes: ["/onboarding"],
    related: ["profile"],
  },
  {
    id: "vibe-edit",
    title: "Vibe Edit",
    summary: "Refine any generated document by describing changes in natural language — like chatting with an AI editor.",
    steps: [
      'Click "Refine with AI" on the Dashboard tab',
      "Type your refinement instructions in the text field",
      "Submit — the AI applies your changes while preserving formatting",
      "Review the result; repeat for further refinements",
    ],
    tips: [
      'Be specific: "Make the tone more confident" works better than "Change it"',
      "Each refinement creates a new revision you can roll back to",
      "Refinement continues in the background if you navigate away",
    ],
    keywords: ["vibe", "edit", "refine", "natural language", "chat", "ai"],
    routes: ["/applications/"],
    related: ["application-detail", "dashboard-tab"],
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
    related: ["application-detail", "dashboard-tab"],
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
      "The Stories board is also admin-only — regular users won't see it in the nav",
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
