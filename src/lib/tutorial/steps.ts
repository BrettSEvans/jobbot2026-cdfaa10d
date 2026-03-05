import { registerTutorialStep } from "./registry";

registerTutorialStep({
  id: "welcome",
  helpSlug: "applications-list",
  targetSelector: '[data-tutorial="app-table"]',
  title: "Welcome to JobBot!",
  body: "This is your applications hub. Every job application you create will appear here with its status and generated assets.",
  placement: "bottom",
  route: "/",
  order: 1,
});

registerTutorialStep({
  id: "new-app",
  helpSlug: "new-application",
  targetSelector: '[data-tutorial="new-app-btn"]',
  title: "Create a New Application",
  body: "Click here to start a new job application. You'll paste a job URL and JobBot will generate a full application package for you.",
  placement: "bottom",
  route: "/",
  order: 2,
});

registerTutorialStep({
  id: "paste-url",
  helpSlug: "new-application",
  targetSelector: '[data-tutorial="job-url"]',
  title: "Paste the Job URL",
  body: "Paste the full URL of the job posting here. JobBot will scrape the listing, research the company, and extract key details automatically.",
  placement: "bottom",
  route: "/applications/new",
  order: 3,
});

registerTutorialStep({
  id: "upload-resume",
  helpSlug: "profile",
  targetSelector: '[data-tutorial="resume-input"]',
  title: "Add Your Resume",
  body: "Paste or upload your master resume text here. This feeds into every cover letter and resume the AI generates — keep it detailed and up-to-date.",
  placement: "top",
  route: "/profile",
  order: 4,
});

registerTutorialStep({
  id: "view-assets",
  helpSlug: "application-detail",
  targetSelector: '[data-tutorial="asset-tabs"]',
  title: "Browse Your Assets",
  body: "Switch between Dashboard, Cover Letter, Resume, and Industry Assets using these tabs. Each asset is tailored to the specific job and company.",
  placement: "bottom",
  route: "/applications/:id",
  order: 5,
});

registerTutorialStep({
  id: "generate-asset",
  helpSlug: "dynamic-assets",
  targetSelector: '[data-tutorial="generate-btn"]',
  title: "Generate & Regenerate",
  body: "Click here to generate an asset for the first time, or regenerate it with fresh content. Previous versions are saved in revision history.",
  placement: "bottom",
  route: "/applications/:id",
  order: 6,
});

registerTutorialStep({
  id: "download-asset",
  helpSlug: "dynamic-assets",
  targetSelector: '[data-tutorial="download-btn"]',
  title: "Download as PDF",
  body: "Export any asset as a professionally formatted PDF. Ready to attach to your application or share with hiring managers.",
  placement: "bottom",
  route: "/applications/:id",
  order: 7,
});
