

## Add Pipeline Kanban Board to Applications Page

The Applications page currently shows only a flat table. The database already has `pipeline_stage` and `pipeline_stage_history` columns/tables ready. Using the uploaded Stories KanbanBoard/KanbanColumn as the architectural pattern, I'll build a job application Pipeline board with drag-and-drop stage transitions.

### Changes

#### 1. Create `src/components/PipelineBoard.tsx`
Drag-and-drop Kanban board for job applications using `@dnd-kit/core` (already installed).
- **Columns**: Bookmarked, Applied, Interviewing, Offer, Accepted, Withdrawn, Ghosted, Rejected
- **Cards**: Company icon, company name, job title, days-in-stage badge (green < 5d, orange 5-10d, red > 10d), click to navigate to detail
- **Drag-and-drop**: On drop, call `updatePipelineStage` to update `pipeline_stage` + `stage_changed_at` on `job_applications` and insert into `pipeline_stage_history`
- **Drag overlay**: Simplified card preview while dragging
- Pattern follows uploaded `KanbanBoard.tsx` structure (DndContext, sensors, DragOverlay)

#### 2. Create `src/components/PipelineColumn.tsx`
Droppable column component following uploaded `KanbanColumn.tsx` pattern.
- Uses `useDroppable` from dnd-kit
- Uses `useDraggable` for each card
- Color-coded top border per stage
- Badge with card count
- Each card shows: CompanyIcon, company/job title, days-in-stage indicator

#### 3. Add `updatePipelineStage` to `src/lib/api/jobApplication.ts`
```typescript
export async function updatePipelineStage(id: string, newStage: string, oldStage?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  // Update job_applications
  await supabase.from('job_applications')
    .update({ pipeline_stage: newStage, stage_changed_at: new Date().toISOString() })
    .eq('id', id);
  // Insert history record
  if (session?.user?.id) {
    await supabase.from('pipeline_stage_history')
      .insert({ application_id: id, user_id: session.user.id, from_stage: oldStage, to_stage: newStage });
  }
}
```

#### 4. Update `src/pages/Applications.tsx`
- Wrap existing content + new Pipeline board in a `Tabs` component with three tabs: **Applications**, **Pipeline**, **Trash**
- Import `PipelineBoard` and render under the Pipeline tab
- Pass `applications` list and `loadApplications` refetch callback
- Existing table, preview, delete dialog all remain intact under the Applications tab

### Files Modified/Created
| File | Action |
|------|--------|
| `src/components/PipelineBoard.tsx` | Create — drag-and-drop Kanban board |
| `src/components/PipelineColumn.tsx` | Create — droppable column + draggable cards |
| `src/lib/api/jobApplication.ts` | Add `updatePipelineStage` function |
| `src/pages/Applications.tsx` | Add Tabs wrapper with Applications + Pipeline + Trash tabs |

