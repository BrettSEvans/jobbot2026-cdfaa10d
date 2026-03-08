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
  steps: [
    'Sign up with your email or Google SSO.',
    'You will be redirected to the Pending Approval screen automatically.',
    'Wait for an administrator to approve your account.',
    'Once approved, refresh the page or sign in again to access the app.',
  ],
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
    'Applications show their generation status so you know when materials are ready.',
    'Completed applications have all materials generated and available for download.',
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
    `Start a new job application by pasting the job posting URL. ${BRAND.name} will scrape the listing, research the company, and begin generating tailored materials.`,
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
    'The detail view shows all generated materials for a job application. Navigate between Cover Letter, Resume, and any Industry Materials using the tabs.',
  steps: [
    'Use the top tabs to switch between Cover Letter and Resume.',
    'Click "Info" to view application details and the original job description.',
    'Use the Industry Materials bar to view AI-proposed supplementary documents.',
  ],
  tips: [
    'Each document can be refined using Vibe Edit — just describe what you want changed.',
    'Revision history is saved so you can revert to earlier versions.',
  ],
  route: '/applications/:id',
  keywords: ['detail', 'tabs', 'view', 'materials', 'company'],
  relatedSlugs: ['dashboard-tab', 'cover-letter-tab', 'resume-tab', 'dynamic-assets'],
});

registerHelp({
  slug: 'templates',
  title: 'Templates',
  summary:
    'Save your best-performing dashboards and documents as reusable templates. Apply them to future applications to maintain a consistent style.',
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
    'Manage your personal information, resume text, key skills, and preferences. This data is used by the AI to tailor every generated document to your background.',
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
  title: 'Dashboard',
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
  title: 'Industry Materials',
  summary:
    'AI-proposed supplementary documents specific to the job and industry — such as RAID logs, roadmaps, architecture diagrams, or executive reports.',
  steps: [
    'Click "Propose Materials" to have the AI suggest relevant documents.',
    'Review and confirm the proposed documents.',
    'Each document is auto-generated and appears in the Industry Materials bar.',
  ],
  tips: [
    'You can swap a document for a different type using the change button.',
    'Each industry document has its own revision history and Vibe Edit chat.',
  ],
  route: '/applications/:id',
  keywords: ['dynamic', 'industry', 'propose', 'raid', 'roadmap', 'architecture', 'executive'],
  relatedSlugs: ['asset-proposal', 'change-asset'],
});

registerHelp({
  slug: 'ai-chat',
  title: 'Vibe Edit',
  summary:
    'Refine any generated document by describing what you want changed in natural language. The AI will update the document while preserving context.',
  steps: [
    'Navigate to the document you want to refine.',
    'Click "Vibe Edit" and type your request (e.g. "Emphasize leadership").',
    'The document will be updated and a new revision saved automatically.',
  ],
  tips: [
    'Be specific about what to change for best results.',
    'You can refine multiple times — each revision is saved.',
  ],
  route: '/applications/:id',
  keywords: ['refine', 'chat', 'improve', 'edit', 'change', 'ai'],
  relatedSlugs: ['dashboard-tab', 'cover-letter-tab', 'resume-tab'],
});

registerHelp({
  slug: 'asset-proposal',
  title: 'Document Proposals',
  summary:
    'The AI analyzes the job posting and suggests 3 supplementary documents that would strengthen your application for that specific role and industry.',
  steps: [
    'Open an application from your Applications list.',
    'Click "Propose Materials" in the Industry Materials section.',
    'Review the 3 AI-suggested documents and their descriptions.',
    'Confirm the proposals to begin generation.',
  ],
  route: '/applications/:id',
  keywords: ['propose', 'suggest', 'materials', 'documents'],
  relatedSlugs: ['dynamic-assets'],
});

registerHelp({
  slug: 'change-asset',
  title: 'Change Document Type',
  summary:
    'Swap one of your industry documents for a different type. The AI will suggest alternatives and regenerate the new document automatically.',
  steps: [
    'Navigate to an application with generated Industry Materials.',
    'Click the swap/change icon on the document you want to replace.',
    'Select a new document type from the suggestions.',
    'The replacement document will be generated automatically.',
  ],
  route: '/applications/:id',
  keywords: ['change', 'swap', 'replace', 'document'],
  relatedSlugs: ['dynamic-assets'],
});

registerHelp({
  slug: 'batch-mode',
  title: 'Batch Mode',
  summary:
    'Submit multiple job URLs at once. Each URL is processed as a separate application with all materials generated in the background.',
  steps: [
    'Go to "+ New Application" from the Applications page.',
    'Toggle "Batch Mode" on.',
    'Paste multiple job URLs, one per line.',
    'Click "Create All" to submit them together.',
    'Each URL becomes a separate application processed in the background.',
  ],
  tips: [
    'Background jobs banner shows progress for all batch items.',
  ],
  route: '/applications/new',
  keywords: ['batch', 'multiple', 'bulk', 'urls'],
  relatedSlugs: ['new-application', 'background-jobs'],
});

registerHelp({
  slug: 'background-jobs',
  title: 'Background Jobs',
  summary:
    'When materials are generating in the background, a banner appears at the top of the screen showing progress. You can continue using the app while generation runs.',
  steps: [
    'Submit one or more applications (single or batch mode).',
    'A progress banner appears at the top of the screen.',
    'Continue browsing or editing while generation runs.',
    'The banner updates in real-time and disappears when all jobs finish.',
  ],
  keywords: ['background', 'jobs', 'progress', 'banner', 'generating'],
  relatedSlugs: ['batch-mode'],
});

registerHelp({
  slug: 'style-preferences',
  title: 'Style Preferences',
  summary:
    'The system learns your writing style preferences over time from your refinement requests. These preferences are automatically applied to future generations.',
  steps: [
    'Use Vibe Edit to refine your documents — the system learns from each request.',
    'Go to your Profile page to view the Style Preferences card.',
    'Review learned preferences grouped by category (tone, formatting, etc.).',
    'Delete any preferences you no longer want applied.',
  ],
  tips: [
    'View and manage learned preferences from the style preferences card.',
    'Preferences include tone, formatting, vocabulary, and emphasis patterns.',
  ],
  route: '/profile',
  keywords: ['style', 'preferences', 'tone', 'learned', 'writing'],
  relatedSlugs: ['profile', 'ai-chat'],
});

registerHelp({
  slug: 'save-as-template',
  title: 'Save as Template',
  summary:
    'Save your current dashboard or document as a reusable template. Templates preserve structure and styling for future applications.',
  steps: [
    'Open an application with a generated document you want to save.',
    'Click "Save as Template" on the document tab.',
    'Give the template a label, department, and job function.',
    'The template is now available when creating future applications.',
  ],
  route: '/applications/:id',
  keywords: ['save', 'template', 'reuse'],
  relatedSlugs: ['templates', 'template-selector'],
});

registerHelp({
  slug: 'template-selector',
  title: 'Template Selector',
  summary:
    'Choose from saved templates when generating documents. Templates provide a structural starting point that the AI fills with job-specific content.',
  steps: [
    'Navigate to "+ New Application".',
    'Look for the template selector dropdown.',
    'Browse templates by department or job function.',
    'Select a template — the AI will use its structure for generation.',
  ],
  route: '/applications/new',
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
  steps: [
    'Go to Admin → Test Users and click "Impersonate" on a persona.',
    'A banner confirms you are now acting as that persona.',
    'Create applications and generate materials — they use the persona\'s profile.',
    'Click "Switch Back" in the banner to return to your own account.',
  ],
  tips: [
    'Click "Switch Back" in the banner to return to your own account.',
    'You cannot sign out while impersonating.',
  ],
  keywords: ['impersonate', 'switch', 'test user', 'persona'],
  relatedSlugs: ['test-users'],
});

registerHelp({
  slug: 'pricing',
  title: 'Pricing & Subscriptions',
  summary:
    'View available subscription tiers — Free, Pro, and Premium — and their feature lists. Upgrade your plan to unlock additional generation limits and premium features.',
  steps: [
    'Navigate to the Pricing page from the header or an upgrade prompt.',
    'Compare Free, Pro, and Premium tier features side-by-side.',
    'Click "Upgrade" on your desired plan to start the subscription flow.',
  ],
  route: '/pricing',
  keywords: ['pricing', 'subscription', 'tier', 'free', 'pro', 'premium', 'upgrade', 'plan'],
  relatedSlugs: ['upgrade-gate'],
});

registerHelp({
  slug: 'reset-password',
  title: 'Password Reset',
  summary:
    'Reset your account password by requesting a reset link via email. Click the link to set a new password.',
  steps: [
    'Click "Forgot password?" on the sign-in page.',
    'Enter your email address and submit.',
    'Open the reset link from your inbox.',
    'Enter and confirm your new password.',
  ],
  route: '/reset-password',
  keywords: ['password', 'reset', 'forgot', 'change password'],
  relatedSlugs: ['auth'],
});

registerHelp({
  slug: 'import-job',
  title: 'Import Job (Chrome Extension)',
  summary:
    'Import a job posting from LinkedIn or Indeed using the Chrome Extension. The extension sends job data directly into the app via a deep link.',
  steps: [
    'Install the Chrome Extension from the documentation link.',
    'Navigate to a job posting on LinkedIn or Indeed.',
    'Click the extension icon to import the job.',
  ],
  tips: [
    'The import endpoint is rate-limited to 10 imports per hour.',
    'You must be signed in for the import to work.',
  ],
  route: '/import',
  keywords: ['import', 'chrome', 'extension', 'linkedin', 'indeed', 'deep link'],
  relatedSlugs: ['new-application'],
});

registerHelp({
  slug: 'ats-score',
  title: 'ATS Score Scanning',
  summary:
    'Scan your resume against the job description to get an ATS (Applicant Tracking System) compatibility score. The score shows keyword match percentage and suggestions for improvement.',
  steps: [
    'Open any application from your Applications list.',
    'Generate a resume first — the ATS card only appears once a resume exists.',
    'Find the "ATS Match Score" card below the resume section.',
    'Click the refresh/rescan button to score your resume against the job description.',
    'Expand the card (chevron) to see matched keywords, missing keywords, and improvement suggestions.',
    'Refine your resume using the suggestions, then rescan to see your updated score.',
  ],
  tips: [
    'Higher scores indicate better keyword alignment with the job posting.',
    'Refine your resume based on the score breakdown to improve match rate.',
  ],
  route: '/applications/:id',
  keywords: ['ats', 'score', 'scan', 'keywords', 'match', 'applicant tracking'],
  relatedSlugs: ['resume-tab', 'application-detail'],
});

registerHelp({
  slug: 'wysiwyg-editor',
  title: 'WYSIWYG Editor',
  summary:
    'Edit cover letters and resumes inline with a rich-text editor. Supports bold, italic, lists, and other formatting without leaving the application detail page.',
  steps: [
    'Open an application and switch to the Cover Letter or Resume tab.',
    'Click the "Edit" toggle to activate the WYSIWYG editor.',
    'Use the toolbar to apply bold, italic, lists, and other formatting.',
    'Click "Save" — a new revision is created automatically.',
  ],
  tips: [
    'Changes made in the editor create a new revision automatically.',
    'Use the toolbar for formatting options.',
  ],
  route: '/applications/:id',
  keywords: ['wysiwyg', 'editor', 'rich text', 'inline', 'edit', 'format'],
  relatedSlugs: ['cover-letter-tab', 'resume-tab'],
});

registerHelp({
  slug: 'upgrade-gate',
  title: 'Upgrade Gate',
  summary:
    'Certain features are locked behind paid subscription tiers. An upgrade prompt will appear when you try to access a gated feature on the free plan.',
  steps: [
    'Try to use a feature that requires a paid tier.',
    'An upgrade prompt appears explaining the required plan.',
    'Click "Upgrade" to go to the Pricing page.',
    'Select a plan to unlock the feature.',
  ],
  tips: [
    'Visit the Pricing page to compare tier features.',
    'Pro and Premium tiers unlock higher generation limits and additional asset types.',
  ],
  keywords: ['upgrade', 'gate', 'locked', 'tier', 'paywall', 'premium'],
  relatedSlugs: ['pricing'],
});

registerHelp({
  slug: 'onboarding-wizard',
  title: 'Onboarding Wizard',
  summary:
    'A guided setup flow for new users to enter their name, upload a resume, and specify key skills and target industries. Completing onboarding ensures the best AI-generated results.',
  steps: [
    'After approval, you will be guided through the onboarding wizard.',
    'Enter your name and years of experience.',
    'Upload or paste your resume text.',
    'Add key skills and target industries.',
  ],
  keywords: ['onboarding', 'wizard', 'setup', 'first time', 'new user'],
  relatedSlugs: ['profile'],
});

registerHelp({
  slug: 'export-downloads',
  title: 'PDF & DOCX Export',
  summary:
    'Download your generated cover letters, resumes, and dashboards as PDF or DOCX files for use in applications.',
  steps: [
    'Open an application and navigate to the document you want to export.',
    'Click the download button (PDF or DOCX icon) on the document tab.',
    'Choose PDF for a pixel-perfect copy or DOCX for an editable version.',
    'The file downloads to your device immediately.',
  ],
  tips: [
    'PDF export preserves the visual layout exactly as shown.',
    'DOCX export is editable in Microsoft Word or Google Docs.',
  ],
  route: '/applications/:id',
  keywords: ['pdf', 'docx', 'export', 'download', 'word', 'file'],
  relatedSlugs: ['cover-letter-tab', 'resume-tab', 'dashboard-tab'],
});

registerHelp({
  slug: 'theme-toggle',
  title: 'Dark / Light Mode',
  summary:
    'Toggle between dark and light themes using the sun/moon icon in the header. Your preference is saved automatically.',
  steps: [
    'Find the sun/moon icon in the top-right corner of the header.',
    'Click it to switch between dark and light mode.',
    'Your preference is saved and persists across sessions.',
  ],
  keywords: ['dark', 'light', 'theme', 'mode', 'toggle'],
});

registerHelp({
  slug: 'navigation',
  title: 'Navigation',
  summary:
    'Use the top navigation bar to move between Applications, Templates, and Profile. Admin users also see a link to the Admin panel.',
  steps: [
    'Use the top navigation bar to switch between Applications, Templates, and Profile.',
    'Admin users will see an additional "Admin" link in the navigation.',
    'Click your avatar or the sign-out button to manage your session.',
  ],
  keywords: ['nav', 'menu', 'header', 'navigate'],
  relatedSlugs: ['applications-list', 'templates', 'profile', 'admin-panel'],
});

registerHelp({
  slug: 'tutorial-walkthrough',
  title: 'Interactive Tutorial',
  summary:
    'A guided walkthrough that shows you how to create applications, upload your resume, generate assets, and download them as PDFs.',
  steps: [
    'Click "Start Tutorial" from the help menu or onboarding prompt.',
    'Follow the highlighted steps as the tutorial guides you through the app.',
    'Complete each step to advance — you can skip or exit at any time.',
  ],
  keywords: ['tutorial', 'walkthrough', 'tour', 'guide', 'onboarding', 'help'],
  relatedSlugs: ['applications-list', 'new-application', 'profile'],
});

registerHelp({
  slug: 'resume-health-dashboard',
  title: 'Resume Health Dashboard',
  summary:
    'An AI-powered analysis tool that scores your tailored resume against the job description across four dimensions: ATS keyword match, bullet impact, verb repetition, and formatting/professionalism.',
  steps: [
    'After your resume is generated, the Resume Health Score card appears automatically.',
    'Click the expand chevron to open the full dashboard with four analysis sections.',
    'Use the sidebar tabs (ATS Match, Impact, Repetition, Formatting) to explore each dimension.',
    'The delta badge shows improvement compared to your original baseline resume.',
    'Click the refresh icon to re-scan after editing your resume.',
  ],
  tips: [
    'The score auto-triggers when your resume is first generated — no manual scan needed.',
    'Weak bullet suggestions show you exactly how to add quantifiable impact.',
    'Overused verbs are flagged with synonym alternatives you can swap in.',
    'The baseline delta helps you see how much the AI tailoring improved your resume.',
  ],
  keywords: ['ats', 'score', 'health', 'keywords', 'impact', 'repetition', 'formatting', 'resume analysis'],
  relatedSlugs: ['application-detail', 'resume-tab'],
});
