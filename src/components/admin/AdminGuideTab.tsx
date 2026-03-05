import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminGuideTab() {
  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 pr-4">

        <h2>Part I — Current Admin Features</h2>

        <h3>1. Accessing the Admin Panel</h3>
        <ol>
          <li>Log in to JobBot with your admin account.</li>
          <li>Navigate to <strong>Profile</strong> (top-right avatar → Profile).</li>
          <li>Click <strong>"Admin Settings"</strong> (only visible to users with the <code>admin</code> role).</li>
          <li>You'll land on <code>/admin</code>.</li>
        </ol>
        <p><strong>If you don't see the button:</strong> Your account doesn't have the admin role. Another admin must grant it.</p>

        <h3>2. Resume Prompt Styles Management</h3>
        <p>Controls the AI system prompts used to generate tailored resumes.</p>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Action</th><th>How</th></tr></thead>
            <tbody>
              <tr><td><strong>View all styles</strong></td><td>Listed in the "Prompts" tab, including inactive ones</td></tr>
              <tr><td><strong>Create a new style</strong></td><td>Click "+ Add New Style" → fill in fields → Save</td></tr>
              <tr><td><strong>Edit a style</strong></td><td>Click the ✏️ icon → modify fields → Save</td></tr>
              <tr><td><strong>Delete a style</strong></td><td>Click 🗑️. <strong>⚠️ Permanent — no undo.</strong></td></tr>
              <tr><td><strong>Deactivate a style</strong></td><td>Edit → toggle Active off → Save</td></tr>
              <tr><td><strong>Reorder styles</strong></td><td>Edit → change Sort Order. Lower = first.</td></tr>
            </tbody>
          </table>
        </div>

        <h4>Fields</h4>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Field</th><th>Required</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td>Label</td><td>✅</td><td>Display name (e.g., "Traditional Corporate")</td></tr>
              <tr><td>Slug</td><td>✅</td><td>Unique URL-safe key (e.g., <code>traditional-corporate</code>)</td></tr>
              <tr><td>Description</td><td>❌</td><td>Subtitle shown in user dropdown</td></tr>
              <tr><td>System Prompt</td><td>✅</td><td>Full AI instructions shaping resume output</td></tr>
              <tr><td>Active</td><td>—</td><td>Visibility toggle for end users</td></tr>
              <tr><td>Sort Order</td><td>—</td><td>Integer controlling display order (default: 0)</td></tr>
            </tbody>
          </table>
        </div>

        <h3>3. Admin User Management</h3>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Action</th><th>How</th></tr></thead>
            <tbody>
              <tr><td><strong>View current admins</strong></td><td>Listed in the "Users" tab with truncated user IDs</td></tr>
              <tr><td><strong>Add a new admin</strong></td><td>Paste user UUID → click "Add Admin"</td></tr>
              <tr><td><strong>Remove an admin</strong></td><td>Click 🗑️. You cannot remove yourself.</td></tr>
            </tbody>
          </table>
        </div>

        <h3>4. Security Architecture</h3>
        <ul>
          <li><strong>Server-side enforcement:</strong> <code>has_role()</code> PostgreSQL function (<code>SECURITY DEFINER</code>). Cannot be bypassed from client.</li>
          <li><strong>RLS policies:</strong> Non-admins cannot modify <code>resume_prompt_styles</code> or <code>user_roles</code>.</li>
          <li><strong>Frontend gating:</strong> <code>useAdminRole</code> hook is UI-only — enforcement is always at the database layer.</li>
        </ul>

        <h3>5. Troubleshooting</h3>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Issue</th><th>Solution</th></tr></thead>
            <tbody>
              <tr><td>"You don't have admin access"</td><td>UUID not in <code>user_roles</code> with role <code>admin</code>. Ask an existing admin.</td></tr>
              <tr><td>Style not appearing for users</td><td>Verify <code>is_active = true</code> and save was successful.</td></tr>
              <tr><td>Can't delete a prompt style</td><td>Confirm login + admin role. Check console for RLS errors.</td></tr>
              <tr><td>"Add Admin" fails</td><td>UUID must be a valid, existing auth user.</td></tr>
            </tbody>
          </table>
        </div>

        <hr />

        <h2>Part II — Enhancement Roadmap</h2>

        <h3>Priority Framework</h3>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Priority</th><th>Criteria</th><th>Timeline</th></tr></thead>
            <tbody>
              <tr><td><strong>P0 — Critical</strong></td><td>Security risk, data loss, or blocks core workflow</td><td>Sprint 1 (1–2 weeks)</td></tr>
              <tr><td><strong>P1 — High</strong></td><td>Major usability gap; required for managing &gt;10 users</td><td>Sprint 2 (2–4 weeks)</td></tr>
              <tr><td><strong>P2 — Medium</strong></td><td>Operational efficiency; nice-to-have</td><td>Sprint 3 (4–8 weeks)</td></tr>
              <tr><td><strong>P3 — Low</strong></td><td>Scale features; valuable at 100+ users</td><td>Backlog</td></tr>
            </tbody>
          </table>
        </div>

        <h3>P0 — Critical Infrastructure</h3>
        <ul>
          <li><strong>P0.1</strong> — Destructive action confirmations (AlertDialog)</li>
          <li><strong>P0.2</strong> — Rate limiting infrastructure (<code>generation_usage</code> table)</li>
          <li><strong>P0.3</strong> — Admin audit log</li>
          <li><strong>P0.4</strong> — Soft-delete for prompt styles</li>
        </ul>

        <h3>P1 — User Management & Visibility</h3>
        <ul>
          <li><strong>P1.1</strong> — User directory with search</li>
          <li><strong>P1.2</strong> — User block / unblock system</li>
          <li><strong>P1.3</strong> — Bulk user operations</li>
          <li><strong>P1.4</strong> — Admin dashboard home tab</li>
          <li><strong>P1.5</strong> — Tabbed admin layout</li>
        </ul>

        <h3>P2 — Analytics & Governance</h3>
        <ul>
          <li><strong>P2.1</strong> — Usage analytics dashboard</li>
          <li><strong>P2.2</strong> — Role granularity (moderator)</li>
          <li><strong>P2.3</strong> — GDPR/CCPA data export</li>
          <li><strong>P2.4</strong> — In-app notification system</li>
          <li><strong>P2.5</strong> — Generation error queue</li>
        </ul>

        <h3>P3 — AI Agents & Scale</h3>
        <ul>
          <li><strong>P3.1</strong> — Usage anomaly detector agent</li>
          <li><strong>P3.2</strong> — Prompt quality evaluator agent</li>
          <li><strong>P3.3</strong> — Support triage bot</li>
          <li><strong>P3.4</strong> — Onboarding monitor</li>
          <li><strong>P3.5</strong> — Content safety scanner</li>
          <li><strong>P3.6</strong> — Stale account cleanup</li>
        </ul>

        <hr />

        <h3>Implementation Order</h3>
        <div className="font-mono text-xs bg-muted p-4 rounded-lg space-y-1">
          <p className="font-semibold text-foreground">Sprint 1 (P0):</p>
          <p className="text-muted-foreground pl-4">1. P0.1 — AlertDialog confirmations</p>
          <p className="text-muted-foreground pl-4">2. P0.3 — Audit log table + logging</p>
          <p className="text-muted-foreground pl-4">3. P0.4 — Soft-delete for styles</p>
          <p className="text-muted-foreground pl-4">4. P0.2 — Rate limiting table + checks</p>
          <p className="font-semibold text-foreground mt-2">Sprint 2 (P1):</p>
          <p className="text-muted-foreground pl-4">5. P1.5 — Tabbed layout refactor</p>
          <p className="text-muted-foreground pl-4">6. P1.1 — User directory</p>
          <p className="text-muted-foreground pl-4">7. P1.4 — Dashboard home tab</p>
          <p className="text-muted-foreground pl-4">8. P1.2 — Block/unblock system</p>
          <p className="text-muted-foreground pl-4">9. P1.3 — Bulk operations</p>
          <p className="font-semibold text-foreground mt-2">Sprint 3 (P2):</p>
          <p className="text-muted-foreground pl-4">10–14. Error queue, analytics, notifications, moderator role, GDPR export</p>
        </div>

        <p className="text-xs text-muted-foreground mt-6">Version 3.0 — Last updated 2026-03-04</p>
      </div>
    </ScrollArea>
  );
}
