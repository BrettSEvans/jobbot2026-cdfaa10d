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
    summary: "Create a new application by pasting a job listing URL or manually entering a job description. ResuVibe scrapes the job details and generates tailored materials.",
    steps: [
      'Click "+ New Application" from the Applications page',
      "Paste the job listing URL into the input field, or click 'Paste text instead' to manually enter a job description",
      "Optionally enter a Company URL for branding and research",
      "Click Submit — the system scrapes and begins generating materials",
      "Monitor progress via the background generation banner",
    ],
    tips: [
      "Use Batch Mode to paste up to 5 URLs at once",
      "Generation continues in the background even if you navigate away",
      "Blocked sites (like LinkedIn) are auto-detected — you'll be prompted to paste the JD manually",
      "You can switch between URL and manual paste modes at any time",
    ],
    keywords: ["new", "create", "url", "paste", "batch", "scrape", "manual"],
    routes: ["/applications/new"],
    related: ["applications-list", "batch-mode", "background-jobs"],
  },
  {
    id: "batch-mode",
    title: "Batch Mode",
    summary: "Submit up to 5 job URLs at once. Each entry generates materials independently in the background.",
    steps: [
      'Toggle "Batch Mode" on the New Application page',
      "Add up to 5 URLs (or switch individual entries to manual paste)",
      "Optionally set a company URL per entry",
      "Click Submit All — each job is queued and processed in parallel",
    ],
    tips: [
      "Each batch entry can independently use URL scraping or manual paste",
      "All jobs generate in the background — navigate away and come back later",
      "Failed entries can be retried individually from the Applications list",
    ],
    keywords: ["batch", "bulk", "multiple", "queue", "parallel"],
    routes: ["/applications/new"],
    related: ["new-application", "background-jobs"],
  },
  {
    id: "background-jobs",
    title: "Background Generation",
    summary: "Materials generate in the background so you can keep working. A banner shows progress for active jobs.",
    steps: [
      "Submit a new application — generation starts automatically",
      "A progress banner appears showing the current step",
      "Navigate freely — generation continues in the background",
      "Click the banner to jump to the application when complete",
    ],
    tips: [
      "The pipeline runs: scrape → analyze → generate resume → generate cover letter → generate dashboard → generate materials",
      "If a step fails, the error is saved and you can retry later",
      "Multiple jobs can run simultaneously in batch mode",
    ],
    keywords: ["background", "progress", "banner", "generate", "pipeline"],
    routes: ["/", "/applications/new", "/applications/"],
    related: ["new-application", "batch-mode"],
  },
  {
    id: "application-detail",
    title: "Application Detail",
    summary: "View all generated materials for a job application across tabs: Resume, Cover Letter, JD Analysis, Materials, and Details.",
    steps: [
      "Use the tab strip to switch between Resume, Cover Letter, JD Analysis, Materials, and Details",
      "Use prev/next arrows in the header to navigate between applications sequentially",
      'Click "Download HTML" or "Copy HTML" to export any document',
      "Use the ⋯ actions for Regenerate, Copy, Revision History, Save as Template",
    ],
    tips: [
      "The Resume tab is the default — it shows your optimized resume and all resume tools",
      "Use the prev/next arrows to quickly review multiple applications without going back to the list",
      "Revision history is saved automatically with every generation and refinement",
      "The pipeline stage dropdown lets you track where each application stands",
    ],
    keywords: ["detail", "resume", "cover letter", "materials", "download", "tabs", "prev", "next"],
    routes: ["/applications/"],
    related: ["resume-tab", "cover-letter", "jd-analysis", "dashboard-tab", "materials-tab", "details-tab"],
  },
  {
    id: "resume-tab",
    title: "Resume Tab",
    summary: "View your AI-optimized resume with keyword injection, diff viewer, ATS compliance checker, bullet coach, and resume health panel.",
    steps: [
      "Navigate to the Resume tab on any application",
      "View the generated resume in the iframe preview",
      "Use Keyword Gap Analysis to identify missing keywords and inject them",
      "Review the Resume Diff to see what changed vs. your baseline",
      "Check ATS Format Compliance for formatting issues",
      "Use Bullet Coach for XYZ-format improvements",
      "Review Resume Health for an overall quality score",
    ],
    tips: [
      "If no resume exists yet, the tab guides you through generating one",
      "You need resume text in your Profile for keyword analysis to work",
      "Download or Copy the resume HTML for use in external tools",
      "Choose from multiple resume styles when generating",
      "Select a different source resume to tailor for different roles",
    ],
    keywords: ["resume", "optimize", "keyword", "ats", "diff", "bullet", "health", "style"],
    routes: ["/applications/"],
    related: ["keyword-analysis", "resume-diff", "ats-compliance", "bullet-coach", "resume-health", "resume-manager"],
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
    id: "resume-health",
    title: "Resume Health Panel",
    summary: "An overall quality assessment of your generated resume, checking length, keyword density, formatting, and completeness.",
    steps: [
      "The Resume Health panel appears on the Resume tab when a resume is generated",
      "Review individual check results (pass/warn/fail)",
      "Address any warnings to improve overall resume quality",
    ],
    tips: [
      "Resume Health runs automatically — no button click needed",
      "It complements ATS Compliance by checking content quality, not just formatting",
      "A healthy resume typically has strong keyword matches, quantified bullets, and proper length",
    ],
    keywords: ["health", "quality", "score", "check", "resume"],
    routes: ["/applications/"],
    related: ["resume-tab", "ats-compliance", "bullet-coach"],
  },
  {
    id: "resume-manager",
    title: "Resume Manager",
    summary: "Upload and manage multiple resumes. Choose which resume to use as the source for each application's AI generation.",
    steps: [
      "Navigate to your Profile page",
      "Upload PDF or text resumes in the Resume Manager section",
      "Set one resume as 'Active' — this is the default source for new applications",
      "When generating a resume for an application, choose a different source resume if needed",
    ],
    tips: [
      "Keep multiple versions for different job types (e.g., technical vs. management)",
      "The active resume's text is used as context for all AI generations by default",
      "PDF resumes are automatically parsed to extract text",
    ],
    keywords: ["resume", "upload", "manage", "multiple", "active", "pdf"],
    routes: ["/profile"],
    related: ["profile", "resume-tab"],
  },
  {
    id: "jd-analysis",
    title: "JD Analysis Tab",
    summary: "Deep analysis of the job description — structured intelligence extraction, summary preview, and editable job/company URLs.",
    steps: [
      "Navigate to the JD Analysis tab on any application",
      "Expand Job & Company URLs to edit the job URL or company URL",
      "Review JD Intelligence: requirements, seniority signals, culture keywords, red flags, and job health score",
      "Check the Summary Preview for a tailored professional summary",
      "Edit the raw job description text if needed",
    ],
    tips: [
      "JD Intelligence categorizes requirements as must-have, preferred, or bonus",
      "Culture keywords are routed to cover letters; technical keywords to resumes",
      "Red flags highlight concerning language in the job posting",
      "The job health score (0-100) rates the quality of the job posting itself",
      "The job URL is now editable — update it if the original link was wrong",
    ],
    keywords: ["jd", "analysis", "intelligence", "summary", "requirements", "health", "red flags", "url"],
    routes: ["/applications/"],
    related: ["application-detail", "keyword-analysis", "resume-tab", "summary-preview"],
  },
  {
    id: "summary-preview",
    title: "Summary Preview",
    summary: "AI generates a tailored professional summary based on your resume, the job description, and company context.",
    steps: [
      "The Summary Preview appears on the JD Analysis tab when a JD and resume are available",
      "Review the generated summary",
      "Click Approve to confirm — this summary is used in full resume generation",
    ],
    tips: [
      "The summary combines your experience with the specific job requirements",
      "It uses company name and job title for precise targeting",
      "Approve the summary before generating the full resume for best results",
    ],
    keywords: ["summary", "preview", "professional", "approve"],
    routes: ["/applications/"],
    related: ["jd-analysis", "resume-tab"],
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
      "Add custom instructions when regenerating for specific adjustments",
    ],
    tips: [
      "Set a master cover letter in your Profile to improve tone matching",
      "Regeneration saves the previous version as a revision automatically",
      "Browse revision history to compare and restore older versions",
      "Cover letters use streaming — you'll see text appear in real-time during generation",
    ],
    keywords: ["cover letter", "generate", "edit", "copy", "master", "stream"],
    routes: ["/applications/"],
    related: ["application-detail", "profile"],
  },
  {
    id: "dashboard-tab",
    title: "Dashboard Tab",
    summary: "A branded, interactive research dashboard with company analysis, market intelligence, and competitive landscape.",
    steps: [
      "Navigate to the Dashboard tab on any application",
      'Use "Vibe Edit" to chat and request changes',
      "Download as ZIP for separate HTML/CSS/JS files, or as single HTML",
      'Click "Save as Template" to reuse the layout for future applications',
    ],
    tips: [
      "Dashboard generation uses company branding colors when available",
      "Refinement continues in the background if you navigate away",
      "Revision history tracks every refinement for easy rollback",
    ],
    keywords: ["dashboard", "refine", "download", "zip", "template", "branding"],
    routes: ["/applications/"],
    related: ["application-detail", "templates", "vibe-edit"],
  },
  {
    id: "materials-tab",
    title: "Materials Tab",
    summary: "Additional AI-generated deliverables beyond resume and cover letter — RAID logs, roadmaps, architecture diagrams, executive reports, and custom assets.",
    steps: [
      "Navigate to the Materials tab on any application",
      "View AI-suggested assets based on the job description",
      "Select which materials to generate",
      "Click Generate to create selected materials",
      "Download individual materials as HTML or PDF",
    ],
    tips: [
      "Materials are generated based on the role type — a PM role might get a roadmap, while an engineering role gets architecture diagrams",
      "Each material has its own revision history",
      "You can refine materials with the inline editor",
      "Use these materials in interviews to demonstrate domain knowledge",
      "Downloads produce clean PDFs without timestamps or browser headers",
    ],
    keywords: ["materials", "raid", "roadmap", "architecture", "executive", "assets", "generate"],
    routes: ["/applications/"],
    related: ["application-detail", "dashboard-tab"],
  },
  {
    id: "details-tab",
    title: "Details Tab",
    summary: "Edit application metadata: company name, job title, company URL, and other fields. Also shows raw research data.",
    steps: [
      "Navigate to the Details tab on any application",
      "Click Edit to modify company name, job title, or other fields",
      "Save changes — these propagate to all generated materials on next regeneration",
      "Review detected competitors, products, and customers from company research",
    ],
    tips: [
      "The Details tab is useful for fixing auto-detected company names or job titles",
      "Company URL is used for branding research — update it for better dashboard colors",
      "Pipeline stage can also be changed from here",
    ],
    keywords: ["details", "edit", "metadata", "company", "title", "competitors", "products"],
    routes: ["/applications/"],
    related: ["application-detail", "jd-analysis"],
  },
  {
    id: "pipeline",
    title: "Pipeline (Kanban Board)",
    summary: "A drag-and-drop board showing applications by stage: Bookmarked, Applied, Interviewing, Offer, Accepted, Withdrawn, Ghosted, Rejected.",
    steps: [
      'Click the "Pipeline" tab on the Applications page',
      "Drag application cards between columns to move them through stages",
      "Use checkboxes to select multiple cards for bulk stage updates",
      "Use the bulk action bar to move all selected cards at once",
      "Click a card to navigate to its detail page",
    ],
    tips: [
      'New applications default to the "Bookmarked" stage',
      "Bulk select + drag moves all selected cards together",
      "You can change stage from the detail page using the stage dropdown",
      "Stale applications (48+ hours) trigger a one-time status update reminder",
      "Company logos are shown on pipeline cards when available",
    ],
    keywords: ["pipeline", "kanban", "drag", "stages", "board", "bulk", "select"],
    routes: ["/"],
    related: ["applications-list", "pipeline-bulk"],
  },
  {
    id: "pipeline-bulk",
    title: "Pipeline Bulk Actions",
    summary: "Select multiple application cards and move them to a new stage all at once using the bulk action bar.",
    steps: [
      "Click the checkbox on pipeline cards to select them",
      "A floating bulk action bar appears at the bottom",
      'Use the "Move to stage…" dropdown to pick the target stage',
      "All selected cards are moved simultaneously",
    ],
    tips: [
      "You can also drag a selected card — all other selected cards will follow",
      "Click 'Clear' to deselect all cards",
      "Bulk actions work across different pipeline columns",
    ],
    keywords: ["bulk", "select", "move", "batch", "pipeline"],
    routes: ["/"],
    related: ["pipeline"],
  },
  {
    id: "profile",
    title: "Profile & Preferences",
    summary: "Manage your name, resume text, key skills, target industries, preferred tone, master cover letter, and uploaded resumes.",
    steps: [
      "Navigate to Profile from the navigation bar",
      "Update your name, experience, and skills",
      "Upload or paste your resume text",
      "Set a master cover letter as a reusable style reference",
      "Manage multiple uploaded resumes and set one as active",
    ],
    tips: [
      "Key skills and target industries personalize your generated documents",
      "Preferred tone affects AI-generated writing style",
      "Resume text is used as context for all document generation",
      "A profile completeness banner appears on the Applications page if resume text is missing",
      "Upload multiple resumes for different job types — set the appropriate one as active",
    ],
    keywords: ["profile", "name", "skills", "industries", "resume", "preferences", "tone", "master cover letter", "upload"],
    routes: ["/profile"],
    related: ["onboarding", "resume-tab", "cover-letter", "resume-manager"],
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
      'Click "Vibe Edit" on the Dashboard tab or use inline editing on materials',
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
    related: ["application-detail", "dashboard-tab", "materials-tab"],
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
    id: "theme-toggle",
    title: "Dark / Light Theme",
    summary: "Switch between dark and light mode for comfortable viewing in any environment.",
    steps: [
      "Click the sun/moon icon in the top navigation bar",
      "The theme toggles immediately",
    ],
    tips: [
      "Your preference is saved and persists across sessions",
      "All generated documents display correctly in both themes",
    ],
    keywords: ["theme", "dark", "light", "mode", "toggle"],
    routes: ["/", "/applications/", "/profile", "/templates", "/admin"],
    related: [],
  },
  {
    id: "ai-chat",
    title: "AI Chat",
    summary: "An AI assistant that can answer questions about your applications and help with job search strategy.",
    steps: [
      "Click the AI Chat button in the navigation bar",
      "Type your question or request",
      "The assistant responds with context-aware guidance",
    ],
    tips: [
      "AI Chat knows about your current application context",
      "Use it for interview prep tips, resume advice, or general career guidance",
    ],
    keywords: ["ai", "chat", "assistant", "help", "guidance"],
    routes: ["/", "/applications/"],
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
      "Review asset quality and design variability scores",
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
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    summary: "Quick keyboard shortcuts for power users to navigate faster.",
    steps: [
      "Press ? to open the help drawer",
      "Use keyboard navigation within the application tabs",
    ],
    tips: [
      "Most actions have keyboard-accessible alternatives",
      "Tab and Enter work throughout the interface for accessibility",
    ],
    keywords: ["keyboard", "shortcuts", "hotkeys", "accessibility"],
    routes: ["/", "/applications/"],
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
