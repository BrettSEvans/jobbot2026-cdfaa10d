import type { Tables } from "@/integrations/supabase/types";
import type { DashboardData } from "@/lib/dashboard/schema";
import type { JDIntelligence } from "@/lib/api/jdIntelligence";

// ── Core domain models derived from Supabase types ──

export type JobApplication = Tables<"job_applications">;

/** Lightweight projection used for the Applications list page. */
export interface JobApplicationListItem {
  id: string;
  company_name: string | null;
  job_title: string | null;
  job_url: string;
  company_url: string | null;
  company_icon_url: string | null;
  status: string;
  generation_status: string;
  generation_error: string | null;
  pipeline_stage: string;
  stage_changed_at: string | null;
  ats_score: unknown;
  ats_scored_at: string | null;
  cover_letter: string | null;
  dashboard_html: string | null;
  created_at: string;
  updated_at: string;
}

export type UserProfile = Tables<"profiles">;

/** Subset of profile fields used in generation hooks. */
export interface UserProfileSnapshot {
  resume_text: string | null;
  master_cover_letter: string | null;
  preferred_tone: string | null;
  key_skills: string[] | null;
  years_experience: string | null;
  first_name: string | null;
  last_name: string | null;
}

export type UserResume = Tables<"user_resumes">;

/** Partial resume used in picker dropdowns (from partial select). */
export interface UserResumePickerItem {
  id: string;
  file_name: string;
  is_active: boolean;
  resume_text: string | null;
}

export type GeneratedAsset = Tables<"generated_assets">;

// ── Re-export commonly paired schema types for convenience ──

export type { DashboardData } from "@/lib/dashboard/schema";
export type { JDIntelligence } from "@/lib/api/jdIntelligence";

// ── Toast helper type ──
export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export type ToastFn = (opts: ToastOptions) => void;

// ── Chat message ──
export interface ChatMessage {
  role: string;
  content: string;
}

// ── Resume diff change ──
export interface FabricationChange {
  tailored_text?: string;
  baseline_text?: string;
}
