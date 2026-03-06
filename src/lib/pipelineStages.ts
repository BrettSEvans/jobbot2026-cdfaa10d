/**
 * Pipeline stage definitions and transition logic.
 */
import { supabase } from '@/integrations/supabase/client';
import { saveJobApplication } from './api/jobApplication';

export const PIPELINE_STAGES = [
  'bookmarked',
  'applied',
  'interviewing',
  'offer',
  'accepted',
  'declined',
  'rejected',
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  bookmarked: 'Bookmarked',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  accepted: 'Accepted',
  declined: 'Declined',
  rejected: 'Rejected',
};

export const STAGE_COLORS: Record<PipelineStage, string> = {
  bookmarked: 'bg-muted text-muted-foreground',
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  interviewing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  offer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  accepted: 'bg-primary/10 text-primary',
  declined: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  rejected: 'bg-destructive/10 text-destructive',
};

/** Normal forward flow */
const LOGICAL_FLOW: Record<PipelineStage, PipelineStage[]> = {
  bookmarked: ['applied'],
  applied: ['interviewing', 'rejected'],
  interviewing: ['offer', 'rejected'],
  offer: ['accepted', 'rejected'],
  accepted: ['declined'],
  declined: [],
  rejected: [],
};

/**
 * Check if a transition is "illogical" (going backwards or skipping).
 */
export function isIllogicalTransition(from: PipelineStage, to: PipelineStage): boolean {
  if (from === to) return false;
  return !LOGICAL_FLOW[from]?.includes(to);
}

/**
 * Calculate days in current stage.
 */
export function daysInStage(stageChangedAt: string | null): number {
  if (!stageChangedAt) return 0;
  const changed = new Date(stageChangedAt);
  return Math.max(0, Math.floor((Date.now() - changed.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Update pipeline stage with history tracking.
 */
export async function updatePipelineStage(
  applicationId: string,
  fromStage: PipelineStage | null,
  toStage: PipelineStage,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const now = new Date().toISOString();

  // Update job_applications
  await saveJobApplication({
    id: applicationId,
    job_url: '',
    pipeline_stage: toStage,
    stage_changed_at: now,
  } as any);

  // Insert history record
  await (supabase as any)
    .from('pipeline_stage_history')
    .insert({
      application_id: applicationId,
      from_stage: fromStage,
      to_stage: toStage,
      changed_at: now,
      user_id: user.id,
    });
}
