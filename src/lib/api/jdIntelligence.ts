import { supabase } from '@/integrations/supabase/client';

// --- Type definitions (union literals, not enums) ---

export type RequirementCategory = 'must_have' | 'preferred' | 'bonus';
export type SkillType = 'hard_skill' | 'soft_skill' | 'certification' | 'education' | 'experience';
export type SeniorityLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'staff' | 'principal' | 'director' | 'vp' | 'c_suite';
export type ManagementScope = 'ic' | 'team_lead' | 'manager' | 'director' | 'executive';
export type CultureSignalType = 'value' | 'work_style' | 'team_dynamic' | 'growth' | 'red_flag';
export type SignalRoute = 'cover_letter' | 'interview_prep' | 'red_flag' | 'none';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface JDRequirement {
  text: string;
  category: RequirementCategory;
  skill_type: SkillType;
}

export interface JDSeniority {
  level: SeniorityLevel;
  years_min?: number;
  years_max?: number;
  management_scope: ManagementScope;
  confidence: number;
  reasoning: string;
}

export interface CultureSignal {
  text: string;
  signal_type: CultureSignalType;
  route_to: SignalRoute;
}

export interface ATSKeyword {
  keyword: string;
  tier: 1 | 2 | 3;
  frequency: number;
  is_in_title: boolean;
}

export interface RedFlagAlert {
  text: string;
  severity: AlertSeverity;
  explanation: string;
}

export interface RedFlagScore {
  score: number;
  total_flags: number;
  top_alerts: RedFlagAlert[];
}

export interface JDIntelligence {
  summary: string;
  job_function: string;
  department: string;
  requirements: JDRequirement[];
  seniority: JDSeniority;
  culture_signals: CultureSignal[];
  ats_keywords: ATSKeyword[];
  red_flag_score: RedFlagScore;
}

export async function parseJobDescription(params: {
  jobDescriptionMarkdown: string;
  companyName?: string;
}): Promise<JDIntelligence> {
  const { data, error } = await supabase.functions.invoke('parse-job-description', {
    body: params,
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'JD parsing failed');

  const { success, ...intelligence } = data;
  return intelligence as JDIntelligence;
}
