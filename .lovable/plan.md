

# Plan: Prompt Log Database Table and Admin UI

## Context

The `docs/PROMPT_LOG.md` file is static markdown with no automated updates. There is no code that writes to it. Since prompts are submitted to Lovable (the AI IDE), they cannot be intercepted programmatically from within the app. The solution is:

1. A `prompt_log` database table for structured storage
2. An admin UI tab for viewing, adding, and managing prompt entries
3. I will manually append new entries to `docs/PROMPT_LOG.md` going forward as part of each response (convention-based)

## Database

New `prompt_log` table:

```sql
CREATE TABLE public.prompt_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_number serial,
  prompt_date date NOT NULL DEFAULT current_date,
  prompt text NOT NULL,
  category text NOT NULL DEFAULT '',
  outcome text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage prompt_log"
  ON public.prompt_log FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

Seed existing 7 entries from `PROMPT_LOG.md`.

## Admin UI

### New file: `src/components/admin/AdminPromptLogTab.tsx`
- Table view with columns: #, Date, Prompt (truncated), Category, Outcome
- "Add Entry" dialog for manually logging prompts
- Expandable rows for full prompt text
- Sort by prompt_number descending (newest first)

### Sidebar update: `src/components/admin/AdminSidebar.tsx`
- Add `{ id: "prompt-log", label: "Prompt Log", icon: MessageSquare, group: "Monitoring", requiresAdmin: true, requiresQA: false }`

### Admin page: `src/pages/Admin.tsx`
- Add `case "prompt-log"` rendering `AdminPromptLogTab`

### Convention
- I will update `docs/PROMPT_LOG.md` with each prompt going forward as a best-effort convention

## Files Changed

| File | Change |
|------|--------|
| Migration | Create `prompt_log` table + RLS + seed data |
| `src/components/admin/AdminPromptLogTab.tsx` | New admin tab component |
| `src/components/admin/AdminSidebar.tsx` | Add prompt-log section |
| `src/pages/Admin.tsx` | Wire new tab |
| `docs/PROMPT_LOG.md` | Append recent prompts (8-14) |

