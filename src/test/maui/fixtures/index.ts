/**
 * Shared Maui Test Fixtures
 * Mock data for all Maui test suites.
 */

export const mockUser = {
  id: "user-111-222-333",
  email: "testuser@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2025-01-01T00:00:00Z",
};

export const mockProfile = {
  id: mockUser.id,
  first_name: "Jane",
  last_name: "Doe",
  middle_name: null,
  display_name: "Jane Doe",
  email: mockUser.email,
  avatar_url: null,
  resume_text: "Experienced software engineer with 8 years...",
  key_skills: ["React", "TypeScript", "Node.js", "AWS"],
  preferred_tone: "professional",
  years_experience: "8",
  target_industries: ["tech", "fintech"],
  approval_status: "approved",
  onboarding_completed_at: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-06-01T00:00:00Z",
};

export const mockJobApplication = {
  id: "app-aaa-bbb-ccc",
  user_id: mockUser.id,
  job_url: "https://example.com/jobs/senior-engineer",
  company_name: "Acme Corp",
  company_url: "https://acme.com",
  job_title: "Senior Software Engineer",
  job_description_markdown: "We are looking for a Senior Software Engineer with React and TypeScript experience...",
  status: "draft",
  generation_status: "complete",
  generation_error: null,
  pipeline_stage: "applied",
  stage_changed_at: "2025-06-01T00:00:00Z",
  ats_score: null,
  ats_scored_at: null,
  selected_assets: null,
  cover_letter: "<p>Dear Hiring Manager...</p>",
  resume_html: "<div>Resume HTML content</div>",
  dashboard_html: "<div>Dashboard</div>",
  executive_report_html: null,
  raid_log_html: null,
  architecture_diagram_html: null,
  roadmap_html: null,
  branding: { primaryColor: "#1a73e8", logo: null },
  competitors: ["CompetitorA", "CompetitorB"],
  customers: ["CustomerX"],
  products: ["ProductY"],
  company_icon_url: "https://acme.com/favicon.ico",
  persona_id: null,
  deleted_at: null,
  deleted_by: null,
  created_at: "2025-06-01T00:00:00Z",
  updated_at: "2025-06-15T00:00:00Z",
};

export const mockSubscription = {
  free: { id: "sub-free", user_id: mockUser.id, tier: "free" as const, status: "active", current_period_start: "2025-06-01", current_period_end: "2025-07-01", stripe_customer_id: null, stripe_subscription_id: null },
  pro: { id: "sub-pro", user_id: mockUser.id, tier: "pro" as const, status: "active", current_period_start: "2025-06-01", current_period_end: "2025-07-01", stripe_customer_id: null, stripe_subscription_id: null },
  premium: { id: "sub-prem", user_id: mockUser.id, tier: "premium" as const, status: "active", current_period_start: "2025-06-01", current_period_end: "2025-07-01", stripe_customer_id: null, stripe_subscription_id: null },
};

export const mockAtsScore = {
  score: 78,
  matchedKeywords: ["React", "TypeScript", "Node.js"],
  missingKeywords: ["Kubernetes", "Terraform", "Go"],
  suggestions: [
    "Add cloud infrastructure experience to your resume",
    "Mention CI/CD pipeline experience",
  ],
  keywordGroups: {
    React: ["React", "React.js", "ReactJS"],
    TypeScript: ["TypeScript", "TS"],
  },
};

export const PIPELINE_STAGES = ["bookmarked", "applied", "interviewing", "offer", "accepted", "withdrawn", "ghosted", "rejected"] as const;

export const mockStageHistory = [
  { id: "sh-1", application_id: mockJobApplication.id, from_stage: null, to_stage: "applied", changed_at: "2025-06-01T00:00:00Z", user_id: mockUser.id },
  { id: "sh-2", application_id: mockJobApplication.id, from_stage: "applied", to_stage: "interviewing", changed_at: "2025-06-10T00:00:00Z", user_id: mockUser.id },
];
