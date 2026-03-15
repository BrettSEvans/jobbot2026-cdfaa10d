

# Plan: Copy Story Tracking System from Logistics Project

## Overview

Port the complete sprint/story tracking system from the [Logistics](/projects/4b3441cf-d3ba-4eb5-af82-13ba9e022794) project into this ResuVibe project. This includes database tables, hooks, UI components, and a full Dashboard page with Sprint view, Kanban board, Charts, and Story management.

## Database Changes (Migration)

Create 6 tables and 1 RPC function. Since this project has authenticated users with RLS, we'll use auth-aware RLS policies instead of the open "anyone can" policies from the Logistics project.

### Tables to create:
1. **`sprints`** — id, name, description, sprint_order, status, start_date, end_date, user_id, timestamps
2. **`epics`** — id, sprint_id (FK sprints), name, description, epic_order, color, timestamps
3. **`stories`** — id, epic_id (FK epics), title, description, acceptance_criteria, status, priority, story_points, persona, story_order, source, lovable_prompt, parent_story_id (self-ref), lexical_order, labels[], due_date, assigned_to, story_tokens, timestamps
4. **`story_comments`** — id, story_id (FK stories), content, author_name, created_at (+ realtime enabled)
5. **`story_links`** — id, source_story_id, target_story_id, link_type, created_at (unique constraint)
6. **`story_templates`** — id, name, description, acceptance_criteria, labels[], priority, created_at

### RPC function:
- **`get_sprint_story_counts()`** — returns sprint_id, total story count, done count

### RLS Policies:
- Authenticated users can CRUD their own sprints (via user_id). Epics/stories/comments/links cascade from sprint ownership. This is more secure than the open policies in the source project.

## New Dependencies

Install: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `framer-motion`

## New Files to Create

### Hooks (7 files):
- `src/hooks/useStories.ts` — CRUD stories, subtasks, subtask counts
- `src/hooks/useSprints.ts` — Read sprints, update sprint status
- `src/hooks/useEpics.ts` — Read epics by sprint
- `src/hooks/useSprintStoryCounts.ts` — Sprint-level story/done counts via RPC
- `src/hooks/useComments.ts` — Comments with realtime subscription
- `src/hooks/useStoryLinks.ts` — Story dependencies (blocks/relates/duplicates)
- `src/hooks/useStoryTemplates.ts` — Story templates CRUD
- `src/hooks/useKeyboardShortcuts.ts` — Ctrl+K command palette, C to create

### Utility files (2 files):
- `src/lib/fractionalIndex.ts` — Lexicographic midpoint for drag-reorder
- `src/lib/labelColors.ts` — Consistent label color generation

### Dashboard Components (16 files in `src/components/stories/`):
- `KanbanBoard.tsx` — DnD kanban with epic/priority grouping
- `KanbanColumn.tsx` — Droppable column with draggable cards
- `SprintView.tsx` — Collapsible epic groups with sortable story cards
- `StoryCard.tsx` — Story row with inline status, priority, labels, assignee
- `StoryDialog.tsx` — Create/edit story dialog with tabs (details, subtasks, dependencies, comments)
- `StoryFilterBar.tsx` — Search, priority, persona, label, overdue filters
- `StoryComments.tsx` — Realtime comment thread
- `StoryDependencies.tsx` — Link stories (blocks, relates, duplicates)
- `StorySubTasks.tsx` — Nested sub-task management
- `QuickAddStory.tsx` — Popover for rapid story creation
- `SprintCharts.tsx` — Burndown + velocity charts (recharts)
- `BulkActionBar.tsx` — Multi-select status/priority/sprint updates
- `LabelBadges.tsx` — Colored label pills
- `LabelInput.tsx` — Tag-style label input
- `CopyPromptButton.tsx` — Copy Lovable prompt with preview
- `AssigneeAvatar.tsx` — Avatar with tooltip
- `ExportButton.tsx` — CSV/JSON export
- `MobileBottomNav.tsx` — Bottom tab bar for mobile
- `CommandPalette.tsx` — Cmd+K searchable command palette
- `StorySidebar.tsx` — Sprint navigation sidebar

### Page:
- `src/pages/StoryBoard.tsx` — Main dashboard page combining all components

## Routing Changes

Add route in `App.tsx`:
```
<Route path="/stories" element={<StoryBoard />} />
```

Add a "Stories" nav link to the `AppHeader`.

## Adaptations from Source

- Replace fleet-specific sidebar navigation with sprint-only sidebar
- Use existing `profiles` table for assignee avatars (already exists in this project)
- Scope data to authenticated user via `user_id` on sprints table
- Remove logistics-specific components (FleetSelector, fleet nav groups)
- Adapt component directory from `dashboard/` to `stories/` to avoid collision with existing dashboard components
- Use existing theme/branding (ResuVibe amber/gold + indigo palette)

## What Users Get

A full project management board with:
- Sprint planning with multiple sprints
- Epic grouping within sprints
- Story cards with priority, labels, due dates, assignees, story points
- Kanban drag-and-drop across statuses (Backlog → To Do → In Progress → Review → Done)
- Sprint list view with drag-reorder
- Burndown and velocity charts
- Comments with real-time updates
- Story dependencies (blocks/relates/duplicates)
- Sub-tasks
- Bulk operations (multi-select status/priority changes)
- Story templates
- CSV/JSON export
- Command palette (Cmd+K)
- Mobile-responsive with bottom nav

