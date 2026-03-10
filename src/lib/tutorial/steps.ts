import { registerTutorialStep } from "./registry";
import { BRAND } from "@/lib/branding";

registerTutorialStep({
  id: "welcome",
  helpSlug: "applications-list",
  targetSelector: '[data-tutorial="app-table"]',
  title: `Welcome to ${BRAND.name}!`,
  body: "This is your applications hub. Every job application you create will appear here with its status and generated assets.",
  placement: "bottom",
  route: "/",
  order: 1,
});

registerTutorialStep({
  id: "pipeline-view",
  helpSlug: "pipeline-kanban",
  targetSelector: '[data-tutorial="pipeline-tab"]',
  title: "Pipeline View",
  body: "Switch to Pipeline view to see all your applications organized by stage — Created, Applied, Interviewing, Offer, Accepted, Withdrawn, and Ghosted. Drag and drop cards between columns to update their status.",
  placement: "bottom",
  route: "/",
  order: 2,
});

registerTutorialStep({
  id: "search-jobs",
  helpSlug: "search-jobs",
  targetSelector: '[data-tutorial="search-jobs-btn"]',
  title: "Search for Jobs",
  body: `Click here to search for job listings across career sites like Google Careers, LinkedIn, Indeed, and more. Found a match? Import it directly into ${BRAND.name} with one click.`,
  placement: "bottom",
  route: "/",
  order: 3,
});

registerTutorialStep({
  id: "new-app",
  helpSlug: "new-application",
  targetSelector: '[data-tutorial="new-app-btn"]',
  title: "Create a New Application",
  body: `Click here to start a new job application. You'll paste a job URL and ${BRAND.name} will generate a full application package for you.`,
  placement: "bottom",
  route: "/",
  order: 4,
});

registerTutorialStep({
  id: "paste-url",
  helpSlug: "new-application",
  targetSelector: '[data-tutorial="job-url"]',
  title: "Paste the Job URL",
  body: `Paste the full URL of the job posting here. ${BRAND.name} will scrape the listing, research the company, and extract key details automatically.`,
  placement: "bottom",
  route: "/applications/new",
  order: 5,
});

registerTutorialStep({
  id: "upload-resume",
  helpSlug: "profile",
  targetSelector: '[data-tutorial="resume-input"]',
  title: "Add Your Resume",
  body: "Paste or upload your master resume text here. This feeds into every cover letter and resume the AI generates — keep it detailed and up-to-date.",
  placement: "top",
  route: "/profile",
  order: 6,
});

registerTutorialStep({
  id: "master-cover-letter",
  helpSlug: "master-cover-letter",
  targetSelector: '[data-tutorial="master-cover-letter"]',
  title: "Add Your Master Cover Letter",
  body: "Paste your go-to cover letter here. It's optional, but when provided the AI uses your voice and style as a starting point — making every tailored letter sound like you instead of a generic template.",
  placement: "top",
  route: "/profile",
  order: 7,
});

registerTutorialStep({
  id: "view-assets",
  helpSlug: "application-detail",
  targetSelector: '[data-tutorial="asset-tabs"]',
  title: "Browse Your Assets",
  body: "All your documents live in one tab strip — Resume and Cover Letter on the left, Industry Materials after the separator. Click any tab to view, download, or refine that document.",
  placement: "bottom",
  route: "/applications/:id",
  order: 8,
});

registerTutorialStep({
  id: "pipeline-nudge",
  helpSlug: "pipeline-kanban",
  targetSelector: '[data-tutorial="pipeline-link"]',
  title: "View Full Pipeline",
  body: "Click here to see all your applications organized by stage in the Pipeline board. It's a quick way to jump from a single application to the big picture.",
  placement: "bottom",
  route: "/applications/:id",
  order: 9,
});

// ── Asset Tour Steps ──────────────────────────────────

registerTutorialStep({
  id: "tour-dashboard",
  helpSlug: "dashboard-tab",
  targetSelector: '[data-tutorial="dashboard-tab"]',
  title: "Your Executive Dashboard",
  body: "This interactive dashboard summarizes the company, role, and your strategic fit. It includes six tabs: Executive Overview, domain insights, Roadmap, Agentic Workforce, and CFO View.",
  placement: "bottom",
  route: "/applications/:id",
  order: 10,
  prerequisiteSelector: '[data-tutorial="dashboard-tab"]',
});

registerTutorialStep({
  id: "tour-cover-letter",
  helpSlug: "cover-letter-tab",
  targetSelector: '[data-tutorial="cover-letter-tab"]',
  title: "Tailored Cover Letter",
  body: "Your cover letter is generated from the job description and your resume. You can edit it inline, regenerate it, or browse previous versions in the revision history.",
  placement: "bottom",
  route: "/applications/:id",
  order: 11,
});

registerTutorialStep({
  id: "tour-resume",
  helpSlug: "resume-tab",
  targetSelector: '[data-tutorial="resume-tab"]',
  title: "Customized Resume",
  body: "Each resume is tailored to the specific job posting. Choose from different resume styles, regenerate with fresh content, and download as a professionally formatted PDF.",
  placement: "bottom",
  route: "/applications/:id",
  order: 12,
});

registerTutorialStep({
  id: "tour-industry-assets",
  helpSlug: "dynamic-assets",
  targetSelector: '[data-tutorial="industry-assets-grid"]',
  title: "Industry-Specific Assets",
  body: "After the separator in the tab strip, you'll find AI-proposed documents tailored to the job's industry — like a RAID Log, Architecture Diagram, or Executive Report. Click any tab to view it, or use the swap icon to replace it.",
  placement: "bottom",
  route: "/applications/:id",
  order: 13,
});

registerTutorialStep({
  id: "tour-change-asset",
  helpSlug: "change-asset",
  targetSelector: '[data-tutorial="change-asset-btn"]',
  title: "Swap Any Asset",
  body: "Don't need this document? Click here to replace it with a different industry-relevant asset. The AI will propose fresh options based on the job context.",
  placement: "left",
  route: "/applications/:id",
  order: 13,
});

registerTutorialStep({
  id: "tour-revision-history",
  helpSlug: "application-detail",
  targetSelector: '[data-tutorial="revision-history"]',
  title: "Revision History",
  body: "Every time you generate or regenerate an asset, the previous version is saved here. Click any revision to preview it, or restore an older version.",
  placement: "top",
  route: "/applications/:id",
  order: 14,
  prerequisiteSelector: '[data-tutorial="industry-assets-grid"] button',
});

registerTutorialStep({
  id: "tour-refine-ai",
  helpSlug: "ai-chat",
  targetSelector: '[data-tutorial="refine-ai-btn"]',
  title: "Vibe Edit — Shape Your Assets",
  body: "This is your creative superpower. Click \"Vibe Edit\" in the action bar and describe what you want changed — \"make it punchier\", \"add more metrics\", \"emphasize leadership\". The AI reshapes your asset while keeping everything else intact.",
  placement: "bottom",
  route: "/applications/:id",
  order: 15,
  prerequisiteSelector: '[data-tutorial="industry-assets-grid"] button',
});

registerTutorialStep({
  id: "generate-asset",
  helpSlug: "dynamic-assets",
  targetSelector: '[data-tutorial="generate-btn"]',
  title: "Generate & Regenerate",
  body: "Click here to generate an asset for the first time, or regenerate it with fresh content. Previous versions are saved in revision history.",
  placement: "bottom",
  route: "/applications/:id",
  order: 16,
  prerequisiteSelector: '[data-tutorial="industry-assets-grid"] button',
});

registerTutorialStep({
  id: "download-asset",
  helpSlug: "dynamic-assets",
  targetSelector: '[data-tutorial="download-btn"]',
  title: "Download as PDF",
  body: "The primary filled button on every document — click 'Download PDF' to export a professionally formatted file. It's always the most prominent action in the action bar.",
  placement: "bottom",
  route: "/applications/:id",
  order: 17,
  prerequisiteSelector: '[data-tutorial="industry-assets-grid"] button',
});
