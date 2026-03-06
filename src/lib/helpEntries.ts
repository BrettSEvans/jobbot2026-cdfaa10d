/**
 * Registers help metadata for all existing pages & components.
 * Import this once at app startup so entries are available immediately.
 *
 * CONVENTION: New features should add their own registerHelp() call
 * co-located in the component file. This file covers the initial backfill.
 */
import { registerHelp } from './helpRegistry';
import { BRAND } from './branding';

// ── Pages ──────────────────────────────────────────────

registerHelp({
  slug: 'auth',
  title: 'Sign In & Sign Up',
  summary:
    'Create an account using your email and password, or sign in with Google SSO. After signing up you may need admin approval before accessing the app.',
  steps: [
    'Enter your email and password to sign in, or click "Sign Up" to create a new account.',
    'Alternatively, click "Continue with Google" to use Google SSO.',
    'If you forgot your password, click "Forgot password?" to receive a reset link.',
  ],
  tips: [
    'Certain pre-approved email addresses are granted instant access.',
    'Google SSO users go through the same approval flow as email sign-ups.',
  ],
  route: '/auth',
  keywords: ['login', 'register', 'google', 'sso', 'password', 'sign in', 'sign up'],
});

registerHelp({
  slug: 'pending-approval',
  title: 'Pending Approval',
  summary:
    'After registering, your account must be approved by an administrator. You will see a waiting screen until approval is granted.',
  tips: [
    'Contact your administrator if your approval is taking longer than expected.',
    'If your request is rejected you will see a different message on this screen.',
  ],
  route: '/pending',
  keywords: ['approval', 'pending', 'waiting', 'rejected', 'access'],
});

registerHelp({
  slug: 'applications-list',
  title: 'Applications List',
  summary:
    'View all your job applications in one place. Each card shows the company, role, status, and creation date. Switch to Pipeline view to see applications organized by stage on a drag-and-drop Kanban board.',
  steps: [
    'Browse your existing applications on the main page.',
    'Click any application card to view its details.',
    'Click "+ New Application" to create a new job application.',
    'Switch to the Pipeline tab to see applications in a Kanban board by stage.',
  ],
  tips: [
    'Applications show their generation status so you know when assets are ready.',
    'Completed applications have all assets generated and available for download.',
    'Drag and drop cards in Pipeline view to move applications between stages.',
  ],
  route: '/',
  keywords: ['applications', 'jobs', 'list', 'dashboard', 'home', 'pipeline', 'kanban'],
  relatedSlugs: ['new-application', 'application-detail', 'pipeline-kanban'],
});

registerHelp({
  slug: 'pipeline-kanban',
  title: 'Pipeline (Kanban Board)',
  summary:
    'A drag-and-drop board showing all your applications organized by stage — Created, Applied, Interviewing, Offer, Accepted, Withdrawn, Ghosted, and Rejected. New applications start as Created. If an application stays in Created for over 48 hours, you\'ll get a one-time prompt asking if you\'ve applied. If an application stays in Applied for over 2 weeks, you\'ll be asked if the company ghosted you.',
  steps: [
    'Click the "Pipeline" tab on the Applications page to switch to Kanban view.',
    'Drag application cards between columns to move them through stages.',
    'If a transition seems illogical (e.g. Accepted → Bookmarked), you\'ll see a warning.',
    'Applications bookmarked for 48+ hours trigger a one-time reminder to update their status.',
  ],
  tips: [
    'New applications default to the "Bookmarked" stage.',
    'The "Withdrawn" column tracks offers you chose not to accept.',
    'The "Ghosted" column is for applications where the company stopped responding.',
    'You can also change an application\'s stage from its detail page using the stage dropdown.',
    'The "View all stages →" link on the detail page takes you directly to the Pipeline view.',
  ],
  route: '/',
  keywords: ['pipeline', 'kanban', 'board', 'stages', 'drag', 'drop', 'created', 'applied', 'interviewing', 'offer', 'accepted', 'withdrawn', 'ghosted'],
  relatedSlugs: ['applications-list'],
});

registerHelp({
  slug: 'new-application',
  title: 'New Application',
  summary:
    `Start a new job application by pasting the job posting URL. ${BRAND.name} will scrape the listing, research the company, and begin generating tailored assets.`,
  steps: [
    'Paste the full URL of the job posting.',
    'Optionally select a template or resume style.',
    'Click "Create" and wait for the system to process the job posting.',
  ],
  tips: [
    'Make sure the job URL is publicly accessible for best scraping results.',
    'Batch mode lets you submit multiple URLs at once.',
  ],
  route: '/applications/new',
  keywords: ['new', 'create', 'job url', 'paste', 'scrape'],
  relatedSlugs: ['applications-list', 'batch-mode'],
});

registerHelp({
  slug: 'application-detail',
  title: 'Application Detail',
  summary:
    'The detail view shows all generated assets for a job application. Navigate between Dashboard, Cover Letter, Resume, and any Industry Assets using the tabs.',
  steps: [
    'Use the top tabs to switch between Dashboard, Cover Letter, and Resume.',
    'Click "Info" to view application details and the original job description.',
    'Use the Industry Assets bar to view AI-proposed supplementary documents.',
  ],
  tips: [
    'Each asset can be refined using the AI chat — just describe what you want changed.',
    'Revision history is saved so you can revert to earlier versions.',
  ],
  route: '/applications/:id',
  keywords: ['detail', 'tabs', 'view', 'assets', 'company'],
  relatedSlugs: ['dashboard-tab', 'cover-letter-tab', 'resume-tab', 'dynamic-assets'],
});

registerHelp({
  slug: 'templates',
  title: 'Templates',
  summary:
    'Save your best-performing dashboards and assets as reusable templates. Apply them to future applications to maintain a consistent style.',
  steps: [
    'Go to the Templates page from the navigation bar.',
    'Browse saved templates by department or job function.',
    'When creating a new application, select a template to use as a starting point.',
  ],
  tips: [
    'Templates preserve the HTML structure — content is re-generated to match the new job.',
  ],
  route: '/templates',
  keywords: ['template', 'save', 'reuse', 'style'],
  relatedSlugs: ['save-as-template', 'template-selector'],
});

registerHelp({
  slug: 'profile',
  title: 'Profile',
  summary:
    'Manage your personal information, resume text, key skills, and preferences. This data is used by the AI to tailor every generated asset to your background.',
  steps: [
    'Fill in your name, years of experience, and target industries.',
    'Paste or edit your master resume text — this feeds into all resume generations.',
    'Add key skills that should be highlighted across your applications.',
  ],
  tips: [
    'The more detailed your profile, the better the AI can tailor content.',
    'Preferred tone (e.g. "professional", "conversational") influences generation style.',
  ],
  route: '/profile',
  keywords: ['profile', 'resume', 'skills', 'experience', 'tone', 'name'],
  relatedSlugs: ['style-preferences'],
});

registerHelp({
  slug: 'admin-panel',
  title: 'Admin Panel',
  summary:
    'Accessible to admin users only. Manage user approvals, resume prompt styles, system documents, test users, rate limits, and more.',
  steps: [
    'Navigate to the Admin page from the navigation bar (visible only to admins).',
    'Use tabs to switch between Approvals, Styles, Documents, Users, and other sections.',
  ],
  tips: [
    'The Approvals tab is shown by default — new registrations appear here.',
    'System Documents like the Generation Guide affect AI output across all users.',
  ],
  route: '/admin',
  keywords: ['admin', 'approve', 'reject', 'manage', 'users', 'styles'],
  relatedSlugs: ['approval-queue', 'test-users'],
});

// ── Components / Features ──────────────────────────────

registerHelp({
  slug: 'dashboard-tab',
  title: 'Dashboard Asset',
  summary:
    'An interactive HTML dashboard tailored to the job, showing company research, competitive analysis, and strategic insights. Can be regenerated or refined.',
  steps: [
    'View the rendered dashboard in the Dashboard tab.',
    'Click "Regenerate" to create a fresh version.',
    'Use the AI chat to refine specific sections.',
  ],
  tips: [
    'Dashboards include company branding colors when available.',
    'You can download the dashboard as a PDF or save it as a template.',
  ],
  route: '/applications/:id',
  keywords: ['dashboard', 'company', 'research', 'analysis', 'branding'],
  relatedSlugs: ['application-detail', 'ai-chat'],
});

registerHelp({
  slug: 'cover-letter-tab',
  title: 'Cover Letter',
  summary:
    'A tailored cover letter generated from your profile and the job description. Supports refinement, revision history, and PDF download.',
  steps: [
    'Switch to the Cover Letter tab to view the generated letter.',
    'Use the refine input to request changes (e.g. "make it shorter").',
    'Download as PDF when satisfied.',
  ],
  tips: [
    'The cover letter follows the Generation Guide rules set by your admin.',
    'Revision history lets you compare and revert versions.',
  ],
  route: '/applications/:id',
  keywords: ['cover letter', 'pdf', 'download', 'write', 'letter'],
  relatedSlugs: ['application-detail', 'ai-chat'],
});

registerHelp({
  slug: 'resume-tab',
  title: 'Resume',
  summary:
    'An HTML resume tailored to the specific job posting, built from your profile resume text. Supports style selection, refinement, and revision history.',
  steps: [
    'Switch to the Resume tab to see the generated resume.',
    'Select a different resume style from the dropdown if available.',
    'Refine the resume using the AI chat input.',
  ],
  tips: [
    'Your master resume text in Profile is the foundation — keep it updated.',
    'Different resume styles produce different visual layouts.',
  ],
  route: '/applications/:id',
  keywords: ['resume', 'cv', 'style', 'format', 'tailor'],
  relatedSlugs: ['profile', 'application-detail'],
});

registerHelp({
  slug: 'dynamic-assets',
  title: 'Industry Assets (Dynamic)',
  summary:
    'AI-proposed supplementary documents specific to the job and industry — such as RAID logs, roadmaps, architecture diagrams, or executive reports.',
  steps: [
    'Click "Propose Assets" to have the AI suggest relevant documents.',
    'Review and confirm the proposed assets.',
    'Each asset is auto-generated and appears in the Industry Assets bar.',
  ],
  tips: [
    'You can swap an asset for a different type using the change button.',
    'Each dynamic asset has its own revision history and refinement chat.',
  ],
  route: '/applications/:id',
  keywords: ['dynamic', 'industry', 'propose', 'raid', 'roadmap', 'architecture', 'executive'],
  relatedSlugs: ['asset-proposal', 'change-asset'],
});

registerHelp({
  slug: 'ai-chat',
  title: 'AI Chat Refinement',
  summary:
    'Refine any generated asset by describing what you want changed in natural language. The AI will update the asset while preserving context.',
  steps: [
    'Navigate to the asset you want to refine.',
    'Type your refinement request in the chat input (e.g. "Emphasize leadership").',
    'The asset will be updated and a new revision saved automatically.',
  ],
  tips: [
    'Be specific about what to change for best results.',
    'You can refine multiple times — each revision is saved.',
  ],
  keywords: ['refine', 'chat', 'improve', 'edit', 'change', 'ai'],
  relatedSlugs: ['dashboard-tab', 'cover-letter-tab', 'resume-tab'],
});

registerHelp({
  slug: 'asset-proposal',
  title: 'Asset Proposals',
  summary:
    'The AI analyzes the job posting and suggests 3 supplementary documents that would strengthen your application for that specific role and industry.',
  keywords: ['propose', 'suggest', 'assets', 'documents'],
  relatedSlugs: ['dynamic-assets'],
});

registerHelp({
  slug: 'change-asset',
  title: 'Change Asset Type',
  summary:
    'Swap one of your industry assets for a different document type. The AI will suggest alternatives and regenerate the new asset automatically.',
  keywords: ['change', 'swap', 'replace', 'asset'],
  relatedSlugs: ['dynamic-assets'],
});

registerHelp({
  slug: 'batch-mode',
  title: 'Batch Mode',
  summary:
    'Submit multiple job URLs at once. Each URL is processed as a separate application with all assets generated in the background.',
  tips: [
    'Background jobs banner shows progress for all batch items.',
  ],
  keywords: ['batch', 'multiple', 'bulk', 'urls'],
  relatedSlugs: ['new-application', 'background-jobs'],
});

registerHelp({
  slug: 'background-jobs',
  title: 'Background Jobs',
  summary:
    'When assets are generating in the background, a banner appears at the top of the screen showing progress. You can continue using the app while generation runs.',
  keywords: ['background', 'jobs', 'progress', 'banner', 'generating'],
  relatedSlugs: ['batch-mode'],
});

registerHelp({
  slug: 'style-preferences',
  title: 'Style Preferences',
  summary:
    'The system learns your writing style preferences over time from your refinement requests. These preferences are automatically applied to future generations.',
  tips: [
    'View and manage learned preferences from the style preferences card.',
    'Preferences include tone, formatting, vocabulary, and emphasis patterns.',
  ],
  keywords: ['style', 'preferences', 'tone', 'learned', 'writing'],
  relatedSlugs: ['profile', 'ai-chat'],
});

registerHelp({
  slug: 'save-as-template',
  title: 'Save as Template',
  summary:
    'Save your current dashboard or asset as a reusable template. Templates preserve structure and styling for future applications.',
  keywords: ['save', 'template', 'reuse'],
  relatedSlugs: ['templates', 'template-selector'],
});

registerHelp({
  slug: 'template-selector',
  title: 'Template Selector',
  summary:
    'Choose from saved templates when generating assets. Templates provide a structural starting point that the AI fills with job-specific content.',
  keywords: ['select', 'template', 'choose'],
  relatedSlugs: ['templates', 'save-as-template'],
});

registerHelp({
  slug: 'approval-queue',
  title: 'User Approval Queue',
  summary:
    'Admin-only feature. Review, approve, or reject new user registrations. Pre-approved email addresses bypass this queue automatically.',
  steps: [
    'Go to Admin → Approvals tab.',
    'Review pending registrations.',
    'Click Approve or Reject for each user.',
  ],
  route: '/admin',
  keywords: ['approve', 'reject', 'queue', 'registration', 'admin'],
  relatedSlugs: ['admin-panel'],
});

registerHelp({
  slug: 'test-users',
  title: 'Test User Personas',
  summary:
    'Create fictional test personas to preview how generated assets look for different profiles. Impersonate a test user to generate assets with their resume and skills.',
  steps: [
    'Go to Admin → Test Users.',
    'Create a test persona with name, resume, and skills.',
    'Click "Impersonate" to switch to that persona\'s context.',
  ],
  route: '/admin',
  keywords: ['test', 'persona', 'impersonate', 'fake', 'demo'],
  relatedSlugs: ['admin-panel', 'impersonation'],
});

registerHelp({
  slug: 'impersonation',
  title: 'Impersonation Mode',
  summary:
    'When impersonating a test user, a banner appears at the top of the screen. All generations use the test persona\'s profile data instead of yours.',
  tips: [
    'Click "Switch Back" in the banner to return to your own account.',
    'You cannot sign out while impersonating.',
  ],
  keywords: ['impersonate', 'switch', 'test user', 'persona'],
  relatedSlugs: ['test-users'],
});

registerHelp({
  slug: 'theme-toggle',
  title: 'Dark / Light Mode',
  summary:
    'Toggle between dark and light themes using the sun/moon icon in the header. Your preference is saved automatically.',
  keywords: ['dark', 'light', 'theme', 'mode', 'toggle'],
});

registerHelp({
  slug: 'navigation',
  title: 'Navigation',
  summary:
    'Use the top navigation bar to move between Applications, Templates, and Profile. Admin users also see a link to the Admin panel.',
  keywords: ['nav', 'menu', 'header', 'navigate'],
  relatedSlugs: ['applications-list', 'templates', 'profile', 'admin-panel'],
});

registerHelp({
  slug: 'tutorial-walkthrough',
  title: 'Interactive Tutorial',
  summary:
    'A guided walkthrough that shows you how to create applications, upload your resume, generate assets, and download them as PDFs.',
  keywords: ['tutorial', 'walkthrough', 'tour', 'guide', 'onboarding', 'help'],
  relatedSlugs: ['applications-list', 'new-application', 'profile'],
});
