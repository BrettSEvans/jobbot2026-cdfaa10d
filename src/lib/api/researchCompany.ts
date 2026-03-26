import { supabase } from '@/integrations/supabase/client';

export interface ResearchedSection {
  id: string;
  label: string;
  icon: string;
  description: string;
  metrics: Array<{
    label: string;
    valueFormat: string;
    changeFormat: string;
  }>;
  charts: Array<{
    title: string;
    type: string;
    xAxis: string;
    yAxis: string;
    datasets: number | string;
  }>;
  tables: Array<{
    title: string;
    columns: Array<{ key: string; label: string }>;
    generateRowsFields: Record<string, any>;
  }>;
}

export interface ResearchedCFOScenario {
  id: string;
  title: string;
  description: string;
  type: 'pricing' | 'headcount' | 'expansion';
  relevanceRank: number;
  currencyFormat: boolean;
  sliders: Array<{
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    default: number;
    unit: string;
    controlType: 'slider' | 'toggle' | 'segmented';
    options?: Array<{ label: string; value: number }>;
  }>;
  baseline: Record<string, number>;
  quarters: string[];
  chartType?: 'line' | 'bar' | 'doughnut' | 'radar';
}

export interface ResearchResult {
  success: boolean;
  sections: ResearchedSection[];
  cfoScenarios: ResearchedCFOScenario[];
  reasoning: string;
  error?: string;
}

export async function researchCompany(params: {
  jobUrl?: string;
  companyUrl?: string;
  jobTitle?: string;
  companyName?: string;
  department?: string;
  jobDescription?: string;
}): Promise<ResearchResult> {
  const { data, error } = await supabase.functions.invoke('research-company', {
    body: params,
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return {
    success: data.success ?? true,
    sections: data.sections || [],
    cfoScenarios: data.cfoScenarios || [],
    reasoning: data.reasoning || '',
  };
}
