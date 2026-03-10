/**
 * Registers all manual QA test cases.
 * Import once at app startup (like helpEntries.ts).
 */
import { registerTest } from './qaRegistry';

// ── Auth & Onboarding ─────────────────────────────────

registerTest({
  id: 'qa-signup-email',
  title: 'Sign up with email',
  area: 'Auth',
  route: '/auth',
  helpSlug: 'auth',
  steps: [
    'Navigate to /auth.',
    'Click "Sign Up" tab.',
    'Enter a valid email and password.',
    'Click "Sign Up".',
    'Check inbox for verification email.',
  ],
  expectedResults: [
    'Account is created.',
    'Verification email is received.',
    'After verifying, user lands on pending approval screen.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 4,
  requiresAuth: false,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-signin-email',
  title: 'Sign in with email',
  area: 'Auth',
  route: '/auth',
  helpSlug: 'auth',
  steps: [
    'Navigate to /auth.',
    'Enter existing email and password.',
    'Click "Sign In".',
  ],
  expectedResults: [
    'User is redirected to the applications dashboard.',
    'Header shows user avatar / sign-out.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 2,
  requiresAuth: false,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-google-sso',
  title: 'Google SSO login',
  area: 'Auth',
  route: '/auth',
  helpSlug: 'auth',
  steps: [
    'Navigate to /auth.',
    'Click "Continue with Google".',
    'Complete Google sign-in flow.',
  ],
  expectedResults: [
    'User is authenticated and redirected.',
    'Profile is populated with Google display name.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 3,
  requiresAuth: false,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-password-reset',
  title: 'Password reset flow',
  area: 'Auth',
  route: '/auth',
  helpSlug: 'reset-password',
  steps: [
    'Click "Forgot password?" on sign-in page.',
    'Enter email and submit.',
    'Open reset link from email.',
    'Enter new password and confirm.',
  ],
  expectedResults: [
    'Reset email is received.',
    'Password is updated successfully.',
    'User can sign in with new password.',
  ],
  tags: ['regression'],
  estimatedMinutes: 5,
  requiresAuth: false,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-pending-approval',
  title: 'Pending approval screen',
  area: 'Auth',
  route: '/pending',
  helpSlug: 'pending-approval',
  preconditions: ['User has signed up but is not yet approved.'],
  steps: [
    'Sign in with a non-approved account.',
    'Observe the pending approval screen.',
  ],
  expectedResults: [
    'Pending approval message is displayed.',
    'No navigation to main app is possible.',
  ],
  tags: ['regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-onboarding-wizard',
  title: 'Onboarding wizard completion',
  area: 'Auth',
  route: '/profile',
  helpSlug: 'onboarding-wizard',
  preconditions: ['Newly approved user who has not completed onboarding.'],
  steps: [
    'Sign in as a freshly approved user.',
    'Complete each onboarding step (name, resume, skills).',
    'Submit the wizard.',
  ],
  expectedResults: [
    'Profile is populated with entered data.',
    'Onboarding completed timestamp is set.',
    'User is redirected to applications dashboard.',
  ],
  tags: ['regression'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

// ── Applications ───────────────────────────────────────

registerTest({
  id: 'qa-create-application',
  title: 'Create application from URL',
  area: 'Applications',
  route: '/applications/new',
  helpSlug: 'new-application',
  steps: [
    'Click "+ New Application".',
    'Paste a valid job posting URL.',
    'Click "Create".',
    'Wait for scraping and generation to begin.',
  ],
  expectedResults: [
    'Application card appears on the dashboard.',
    'Generation status shows "generating".',
    'Materials begin populating.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-batch-mode',
  title: 'Batch mode (multiple URLs)',
  area: 'Applications',
  route: '/applications/new',
  helpSlug: 'batch-mode',
  steps: [
    'Click "+ New Application".',
    'Enable batch mode.',
    'Paste 2-3 job URLs.',
    'Submit.',
  ],
  expectedResults: [
    'Multiple applications are created.',
    'Background jobs banner shows progress.',
    'Each application generates independently.',
  ],
  tags: ['regression'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-import-job',
  title: 'Import job via Chrome Extension deep link',
  area: 'Applications',
  route: '/import',
  helpSlug: 'import-job',
  preconditions: ['Chrome Extension installed or deep link URL manually constructed.'],
  steps: [
    'Navigate to /import with valid query parameters (title, company, url).',
    'Observe the import landing page.',
    'Confirm import.',
  ],
  expectedResults: [
    'Application is created from the external data.',
    'User is redirected to the new application detail page.',
  ],
  tags: ['regression'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-command-cards',
  title: 'Application command cards render',
  area: 'Applications',
  route: '/',
  helpSlug: 'applications-list',
  preconditions: ['At least 2 applications exist.'],
  steps: [
    'Navigate to the applications dashboard.',
    'Observe the card grid layout.',
    'Check each card for company logo, title, stage badge, progress bar.',
  ],
  expectedResults: [
    'Cards display in a responsive grid.',
    'Each card shows company icon, job title, pipeline stage, and document progress.',
    'ATS score pill is visible when scored.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-sort-applications',
  title: 'Sort applications',
  area: 'Applications',
  route: '/',
  helpSlug: 'applications-list',
  preconditions: ['At least 3 applications exist.'],
  steps: [
    'Use the sort dropdown to change sort order (newest, oldest, company A-Z).',
    'Observe the card order change.',
  ],
  expectedResults: [
    'Cards reorder according to selected sort.',
  ],
  tags: ['regression'],
  estimatedMinutes: 2,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-soft-delete-restore',
  title: 'Soft-delete & restore from trash',
  area: 'Applications',
  route: '/',
  helpSlug: 'applications-list',
  steps: [
    'Click the three-dot menu on an application card.',
    'Select "Delete".',
    'Switch to the Trash tab.',
    'Restore the deleted application.',
  ],
  expectedResults: [
    'Application moves to trash.',
    'Application reappears in active list after restore.',
  ],
  tags: ['regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-permanent-delete',
  title: 'Permanent delete',
  area: 'Applications',
  route: '/',
  helpSlug: 'applications-list',
  steps: [
    'Move an application to trash.',
    'In the Trash tab, permanently delete it.',
    'Confirm the deletion dialog.',
  ],
  expectedResults: [
    'Application is permanently removed.',
    'It no longer appears in trash.',
  ],
  tags: ['regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-pipeline-kanban',
  title: 'Pipeline/Kanban drag-and-drop',
  area: 'Applications',
  route: '/',
  helpSlug: 'pipeline-kanban',
  preconditions: ['At least 3 applications in different stages.'],
  steps: [
    'Switch to the Pipeline tab.',
    'Drag an application card from one column to another.',
    'Observe the stage update.',
  ],
  expectedResults: [
    'Card moves to the new column.',
    'Stage is persisted on page reload.',
    'Warning appears for illogical transitions.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-ghost-prompt',
  title: 'Ghost prompt dialog (48h nudge)',
  area: 'Applications',
  route: '/',
  helpSlug: 'pipeline-kanban',
  preconditions: ['An application in "Bookmarked" stage for 48+ hours.'],
  steps: [
    'Navigate to the applications dashboard.',
    'Observe the ghost prompt nudge banner.',
    'Respond to the prompt.',
  ],
  expectedResults: [
    'Ghost prompt dialog appears.',
    'Dismissing or responding clears the prompt.',
  ],
  tags: ['regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-background-jobs',
  title: 'Background jobs banner',
  area: 'Applications',
  route: '/',
  helpSlug: 'background-jobs',
  preconditions: ['Trigger a generation (create new application or regenerate a document).'],
  steps: [
    'Create a new application or regenerate a document.',
    'Observe the background jobs banner at the top.',
    'Wait for generation to complete.',
  ],
  expectedResults: [
    'Banner shows progress for each generating document.',
    'Banner disappears when all jobs complete.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 4,
  requiresAuth: true,
  requiresAdmin: false,
});

// ── Application Detail ─────────────────────────────────

registerTest({
  id: 'qa-dashboard-tab',
  title: 'Dashboard tab: view, regenerate, refine',
  area: 'Application Detail',
  route: '/applications/:id',
  helpSlug: 'dashboard-tab',
  preconditions: ['A completed application with a generated dashboard.'],
  steps: [
    'Open an application detail page.',
    'View the Dashboard tab.',
    'Click "Regenerate" to create a fresh version.',
    'Use the Vibe Edit chat to refine a section.',
  ],
  expectedResults: [
    'Dashboard HTML renders correctly.',
    'Regeneration creates a new revision.',
    'Vibe Edit refinement updates the dashboard.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 7,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-cover-letter-tab',
  title: 'Cover letter: view, refine, download PDF',
  area: 'Application Detail',
  route: '/applications/:id',
  helpSlug: 'cover-letter-tab',
  preconditions: ['A completed application with a generated cover letter.'],
  steps: [
    'Switch to the Cover Letter tab.',
    'Review the generated letter.',
    'Refine via Vibe Edit (e.g. "make it shorter").',
    'Download as PDF.',
  ],
  expectedResults: [
    'Cover letter renders correctly.',
    'Refinement updates the content.',
    'PDF download succeeds and contains the letter.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-resume-tab',
  title: 'Resume: view, change style, refine',
  area: 'Application Detail',
  route: '/applications/:id',
  helpSlug: 'resume-tab',
  preconditions: ['A completed application with a generated resume.'],
  steps: [
    'Switch to the Resume tab.',
    'Change the resume style from the dropdown.',
    'Refine via Vibe Edit.',
    'Check revision history.',
  ],
  expectedResults: [
    'Resume renders correctly.',
    'Style change triggers regeneration.',
    'Revision history shows all versions.',
  ],
  tags: ['regression'],
  estimatedMinutes: 6,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-industry-assets',
  title: 'Industry materials: propose, generate, swap',
  area: 'Application Detail',
  route: '/applications/:id',
  helpSlug: 'dynamic-assets',
  preconditions: ['A completed application.'],
  steps: [
    'Click "Propose Materials".',
    'Review proposed documents.',
    'Confirm to generate them.',
    'Swap one document for a different type.',
  ],
  expectedResults: [
    'AI proposes 3 relevant documents.',
    'Documents generate and display.',
    'Swap replaces the document and regenerates.',
  ],
  tags: ['regression'],
  estimatedMinutes: 8,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-ats-score',
  title: 'ATS score: scan and view results',
  area: 'Application Detail',
  route: '/applications/:id',
  helpSlug: 'ats-score',
  preconditions: ['A completed application with a resume.'],
  steps: [
    'Navigate to an application detail page.',
    'Click "Scan ATS" or locate the ATS score card.',
    'Wait for scoring to complete.',
    'Review the score breakdown.',
  ],
  expectedResults: [
    'ATS score is calculated and displayed.',
    'Score breakdown shows keyword matches.',
    'Score persists on page reload.',
  ],
  tags: ['regression'],
  estimatedMinutes: 4,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-revision-history',
  title: 'Revision history: browse and revert',
  area: 'Application Detail',
  route: '/applications/:id',
  helpSlug: 'application-detail',
  preconditions: ['A document with 2+ revisions.'],
  steps: [
    'Open a document tab with multiple revisions.',
    'Open revision history.',
    'Select an older revision.',
    'Revert to it.',
  ],
  expectedResults: [
    'Revision list shows all versions with timestamps.',
    'Reverting updates the displayed content.',
  ],
  tags: ['regression'],
  estimatedMinutes: 4,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-save-template',
  title: 'Save as template',
  area: 'Application Detail',
  route: '/applications/:id',
  helpSlug: 'save-as-template',
  preconditions: ['A completed dashboard or document.'],
  steps: [
    'Open a completed application.',
    'Click "Save as Template".',
    'Enter a label and department.',
    'Submit.',
  ],
  expectedResults: [
    'Template is saved successfully.',
    'Template appears on the Templates page.',
  ],
  tags: ['regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-wysiwyg-editor',
  title: 'WYSIWYG inline editing',
  area: 'Application Detail',
  route: '/applications/:id',
  helpSlug: 'wysiwyg-editor',
  preconditions: ['A generated cover letter or resume.'],
  steps: [
    'Enable WYSIWYG editing mode on a document.',
    'Make text changes (bold, italic, add paragraph).',
    'Save changes.',
  ],
  expectedResults: [
    'Editor renders with toolbar.',
    'Changes are saved and reflected in the document.',
    'A new revision is created.',
  ],
  tags: ['regression'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-export-docx',
  title: 'Export DOCX',
  area: 'Application Detail',
  route: '/applications/:id',
  helpSlug: 'export-downloads',
  preconditions: ['A completed application with resume/cover letter.'],
  steps: [
    'Open an application detail page.',
    'Click export/download button.',
    'Select DOCX format.',
    'Verify downloaded file.',
  ],
  expectedResults: [
    'DOCX file downloads successfully.',
    'File opens in Word with correct content.',
  ],
  tags: ['regression'],
  estimatedMinutes: 4,
  requiresAuth: true,
  requiresAdmin: false,
});

// ── Profile ────────────────────────────────────────────

registerTest({
  id: 'qa-profile-edit',
  title: 'Edit profile (name, experience, tone)',
  area: 'Profile',
  route: '/profile',
  helpSlug: 'profile',
  steps: [
    'Navigate to /profile.',
    'Change display name, years of experience, preferred tone.',
    'Click save.',
    'Reload the page.',
  ],
  expectedResults: [
    'Changes persist after reload.',
    'Updated data is reflected in the header.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 4,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-profile-skills',
  title: 'Add/remove skills and industries',
  area: 'Profile',
  route: '/profile',
  helpSlug: 'profile',
  steps: [
    'Navigate to /profile.',
    'Add 2 new skills.',
    'Remove 1 skill.',
    'Add a target industry.',
    'Save.',
  ],
  expectedResults: [
    'Skills and industries update correctly.',
    'Changes persist after reload.',
  ],
  tags: ['regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-profile-resumes',
  title: 'Upload/rename/delete/star resumes',
  area: 'Profile',
  route: '/profile',
  helpSlug: 'profile',
  steps: [
    'Upload a new resume file.',
    'Rename the uploaded resume.',
    'Star it as active.',
    'Delete a different resume.',
  ],
  expectedResults: [
    'File uploads successfully.',
    'Rename persists.',
    'Active star indicator updates.',
    'Deleted resume is removed.',
  ],
  tags: ['regression'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-profile-save-bar',
  title: 'Save changes (sticky bar)',
  area: 'Profile',
  route: '/profile',
  helpSlug: 'profile',
  steps: [
    'Make any change on the profile page.',
    'Observe the sticky save bar appears.',
    'Click save.',
    'Observe it disappears.',
  ],
  expectedResults: [
    'Sticky bar appears when changes are pending.',
    'Disappears after successful save.',
  ],
  tags: ['regression'],
  estimatedMinutes: 2,
  requiresAuth: true,
  requiresAdmin: false,
});

// ── Templates ──────────────────────────────────────────

registerTest({
  id: 'qa-browse-templates',
  title: 'Browse templates',
  area: 'Templates',
  route: '/templates',
  helpSlug: 'templates',
  steps: [
    'Navigate to /templates.',
    'Browse available templates.',
    'Filter by department or job function if available.',
  ],
  expectedResults: [
    'Templates page loads and displays saved templates.',
    'Each template shows label, department, and preview.',
  ],
  tags: ['regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-apply-template',
  title: 'Apply template to new application',
  area: 'Templates',
  route: '/applications/new',
  helpSlug: 'template-selector',
  preconditions: ['At least one saved template exists.'],
  steps: [
    'Start creating a new application.',
    'Select a template from the template selector.',
    'Complete application creation.',
  ],
  expectedResults: [
    'Template is applied to the new application.',
    'Generated documents follow the template structure.',
  ],
  tags: ['regression'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-delete-template',
  title: 'Delete template',
  area: 'Templates',
  route: '/templates',
  helpSlug: 'templates',
  preconditions: ['At least one saved template exists.'],
  steps: [
    'Navigate to /templates.',
    'Delete a template.',
    'Confirm deletion.',
  ],
  expectedResults: [
    'Template is removed from the list.',
    'No longer available in the template selector.',
  ],
  tags: ['regression'],
  estimatedMinutes: 2,
  requiresAuth: true,
  requiresAdmin: false,
});

// ── Admin ──────────────────────────────────────────────

registerTest({
  id: 'qa-admin-approvals',
  title: 'Approval queue: approve and reject',
  area: 'Admin',
  route: '/admin',
  helpSlug: 'approval-queue',
  preconditions: ['Pending user registrations exist.'],
  steps: [
    'Navigate to Admin → Approvals.',
    'Approve one user.',
    'Reject another user.',
  ],
  expectedResults: [
    'Approved user can now sign in and access the app.',
    'Rejected user sees rejection message.',
  ],
  tags: ['smoke', 'regression', 'admin'],
  estimatedMinutes: 4,
  requiresAuth: true,
  requiresAdmin: true,
});

registerTest({
  id: 'qa-admin-prompts',
  title: 'Prompt styles: CRUD',
  area: 'Admin',
  route: '/admin',
  helpSlug: 'admin-panel',
  steps: [
    'Navigate to Admin → Prompts.',
    'Create a new prompt style.',
    'Edit its label and system prompt.',
    'Soft-delete it.',
    'Restore from trash.',
  ],
  expectedResults: [
    'Style is created and visible.',
    'Edits persist.',
    'Soft delete moves to trash. Restore brings it back.',
  ],
  tags: ['regression', 'admin'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: true,
});

registerTest({
  id: 'qa-admin-gen-guide',
  title: 'System documents: edit generation guide',
  area: 'Admin',
  route: '/admin',
  helpSlug: 'admin-panel',
  steps: [
    'Navigate to Admin → Gen Guide.',
    'Edit the generation guide content.',
    'Save changes.',
  ],
  expectedResults: [
    'Content is saved successfully.',
    'Changes affect subsequent AI generations.',
  ],
  tags: ['regression', 'admin'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: true,
});

registerTest({
  id: 'qa-admin-test-users',
  title: 'Test users: create, impersonate, switch back',
  area: 'Admin',
  route: '/admin',
  helpSlug: 'test-users',
  steps: [
    'Navigate to Admin panel.',
    'Create a new test persona.',
    'Click "Impersonate".',
    'Verify the impersonation banner appears.',
    'Click "Switch Back".',
  ],
  expectedResults: [
    'Test persona is created.',
    'Impersonation banner shows the persona name.',
    'Generations use the persona\'s profile.',
    'Switching back restores the admin context.',
  ],
  tags: ['regression', 'admin'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: true,
});

registerTest({
  id: 'qa-admin-rate-limits',
  title: 'Rate limits tab',
  area: 'Admin',
  route: '/admin',
  helpSlug: 'admin-panel',
  steps: [
    'Navigate to Admin → Limits.',
    'View current rate limit settings.',
    'Add or edit a rate limit override for a user.',
  ],
  expectedResults: [
    'Rate limits display correctly.',
    'Override is saved and applied.',
  ],
  tags: ['regression', 'admin'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: true,
});

registerTest({
  id: 'qa-admin-audit',
  title: 'Audit log tab',
  area: 'Admin',
  route: '/admin',
  helpSlug: 'admin-panel',
  steps: [
    'Navigate to Admin → Audit.',
    'Review recent admin actions.',
  ],
  expectedResults: [
    'Audit log displays actions with timestamps.',
    'Actions include admin ID and target ID.',
  ],
  tags: ['regression', 'admin'],
  estimatedMinutes: 2,
  requiresAuth: true,
  requiresAdmin: true,
});

registerTest({
  id: 'qa-admin-subscriptions',
  title: 'Subscriptions tab',
  area: 'Admin',
  route: '/admin',
  helpSlug: 'admin-panel',
  steps: [
    'Navigate to Admin → Subs.',
    'Search for a user.',
    'Change their subscription tier.',
  ],
  expectedResults: [
    'User list loads and is searchable.',
    'Tier change is saved and reflected.',
  ],
  tags: ['regression', 'admin'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: true,
});

// ── Cross-cutting ──────────────────────────────────────

registerTest({
  id: 'qa-theme-toggle',
  title: 'Dark / light mode toggle',
  area: 'Cross-cutting',
  helpSlug: 'theme-toggle',
  steps: [
    'Click the sun/moon icon in the header.',
    'Observe the theme change.',
    'Reload the page.',
  ],
  expectedResults: [
    'Theme switches between dark and light.',
    'Preference persists after reload.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 1,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-help-drawer',
  title: 'Help drawer: open, search, contextual',
  area: 'Cross-cutting',
  helpSlug: 'navigation',
  steps: [
    'Click the help button (bottom-right).',
    'Search for a topic (e.g. "resume").',
    'Navigate to a specific page, reopen help, verify contextual topics.',
  ],
  expectedResults: [
    'Help drawer opens with all topics.',
    'Search filters topics correctly.',
    'Contextual topics match the current route.',
  ],
  tags: ['regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-tutorial',
  title: 'Interactive tutorial walkthrough',
  area: 'Cross-cutting',
  helpSlug: 'tutorial-walkthrough',
  steps: [
    'Trigger the interactive tutorial (from help or first-time login).',
    'Follow each step of the tutorial.',
    'Dismiss or complete the tutorial.',
  ],
  expectedResults: [
    'Tutorial overlay appears with spotlight mask.',
    'Each step highlights the correct UI element.',
    'Dismissal clears the tutorial state.',
  ],
  tags: ['regression'],
  estimatedMinutes: 4,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-upgrade-gate',
  title: 'Upgrade gate (tier-locked features)',
  area: 'Cross-cutting',
  helpSlug: 'upgrade-gate',
  preconditions: ['User is on the free tier.'],
  steps: [
    'Navigate to a feature gated behind a paid tier.',
    'Attempt to use the feature.',
    'Observe the upgrade prompt.',
  ],
  expectedResults: [
    'Upgrade gate modal/banner appears.',
    'Feature is inaccessible until upgrade.',
    'Link to pricing page works.',
  ],
  tags: ['regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-mobile-responsive',
  title: 'Mobile responsive: nav drawer, touch targets',
  area: 'Cross-cutting',
  tags: ['regression', 'mobile'],
  steps: [
    'Resize browser to 375px width (or use mobile device).',
    'Open the navigation drawer.',
    'Navigate between pages.',
    'Verify touch targets are large enough (44px min).',
    'Test the applications card grid at mobile size.',
  ],
  expectedResults: [
    'Navigation drawer opens and closes correctly.',
    'All interactive elements are reachable.',
    'Cards stack in a single column.',
    'No horizontal overflow.',
  ],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-style-preferences',
  title: 'Style preferences card',
  area: 'Cross-cutting',
  helpSlug: 'style-preferences',
  steps: [
    'Navigate to an application where style preferences exist.',
    'View the style preferences card.',
    'Verify learned preferences are listed.',
  ],
  expectedResults: [
    'Style preferences card displays categories and preferences.',
    'Preferences reflect past refinement patterns.',
  ],
  tags: ['regression'],
  estimatedMinutes: 2,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-pricing-page',
  title: 'Pricing page displays tiers',
  area: 'Cross-cutting',
  route: '/pricing',
  helpSlug: 'pricing',
  steps: [
    'Navigate to /pricing.',
    'Review the free, pro, and premium tier cards.',
    'Check feature lists for each tier.',
  ],
  expectedResults: [
    'All three tiers are displayed.',
    'Feature lists are accurate.',
    'CTA buttons are functional.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 2,
  requiresAuth: false,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-ats-auto-scan',
  title: 'ATS score auto-triggers after resume generation',
  area: 'ATS',
  route: '/applications/:id',
  helpSlug: 'resume-health-dashboard',
  steps: [
    'Create a new application with a job URL.',
    'Wait for background generation to complete (resume appears).',
    'Observe the Resume Health Score card.',
  ],
  expectedResults: [
    'ATS scan triggers automatically when resume first appears.',
    'Score gauge displays with a value 0–100.',
    'Delta badge shows improvement vs baseline (▲+N).',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 5,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-ats-dashboard-sections',
  title: 'Resume Health Dashboard sections render correctly',
  area: 'ATS',
  route: '/applications/:id',
  helpSlug: 'resume-health-dashboard',
  steps: [
    'Navigate to an application with an ATS score.',
    'Click the expand chevron on the Resume Health Score card.',
    'Click each sidebar tab: ATS Match, Impact, Repetition, Formatting.',
  ],
  expectedResults: [
    'ATS Match tab shows matched (green) and missing (red) keyword badges.',
    'Impact tab shows strong/weak bullet counts and weak bullet rewrite suggestions.',
    'Repetition tab shows overused verbs with synonym pills.',
    'Formatting tab shows parse rate bar, found/missing sections, and professionalism flags.',
  ],
  tags: ['regression'],
  estimatedMinutes: 4,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-ats-manual-rescan',
  title: 'Manual ATS rescan updates score',
  area: 'ATS',
  route: '/applications/:id',
  helpSlug: 'resume-health-dashboard',
  steps: [
    'Navigate to an application with an existing ATS score.',
    'Click the refresh icon on the Resume Health Score card.',
    'Wait for the loading spinner to complete.',
  ],
  expectedResults: [
    'Loading spinner appears during scan.',
    'Score updates after scan completes.',
    'All dashboard sections update with new data.',
  ],
  tags: ['regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

// ── Search Jobs ───────────────────────────────────────

registerTest({
  id: 'qa-search-jobs-basic',
  title: 'Basic job search returns results',
  area: 'Search Jobs',
  route: '/search-jobs',
  helpSlug: 'search-jobs',
  steps: [
    'Navigate to /search-jobs.',
    'Enter "Software Engineer" in the search bar.',
    'Click "Search".',
  ],
  expectedResults: [
    'Loading spinner appears.',
    'Results cards are displayed with title, domain, and description.',
    'Each card has "View" and "Import" buttons.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 2,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-search-jobs-site-filter',
  title: 'Site filter narrows search results',
  area: 'Search Jobs',
  route: '/search-jobs',
  helpSlug: 'search-jobs',
  steps: [
    'Navigate to /search-jobs.',
    'Enter "Product Manager" in the search bar.',
    'Select "Google Careers" from the site filter dropdown.',
    'Click "Search".',
  ],
  expectedResults: [
    'Results are returned primarily from careers.google.com.',
    'Result URLs reflect the filtered domain.',
  ],
  tags: ['regression'],
  estimatedMinutes: 2,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-search-jobs-import',
  title: 'Importing a search result creates an application',
  area: 'Search Jobs',
  route: '/search-jobs',
  helpSlug: 'search-jobs',
  steps: [
    'Navigate to /search-jobs.',
    'Search for any job listing.',
    'Click "Import" on a result card.',
  ],
  expectedResults: [
    'Toast confirms import success.',
    'User is navigated to the application detail page.',
    'Job URL and description are pre-filled.',
    'Application appears in the Applications list.',
  ],
  tags: ['smoke', 'regression'],
  estimatedMinutes: 3,
  requiresAuth: true,
  requiresAdmin: false,
});

registerTest({
  id: 'qa-search-jobs-empty',
  title: 'Empty query / no results handling',
  area: 'Search Jobs',
  route: '/search-jobs',
  helpSlug: 'search-jobs',
  steps: [
    'Navigate to /search-jobs.',
    'Leave the search bar empty and click "Search".',
    'Then search for a very obscure query unlikely to return results.',
  ],
  expectedResults: [
    'Search button is disabled when query is empty.',
    'No-results state is displayed with helpful guidance.',
    'No errors are thrown.',
  ],
  tags: ['regression'],
  estimatedMinutes: 2,
  requiresAuth: true,
  requiresAdmin: false,
});
