import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QATestRun {
  id: string;
  build_label: string;
  build_timestamp: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  status: string;
  snapshot_test_ids: string[] | null;
}

export interface QATestResult {
  id: string;
  run_id: string;
  test_case_id: string;
  result: string;
  failure_notes: string | null;
  regression_ticket: string | null;
  regression_fixed_at: string | null;
  tested_by: string;
  created_at: string;
}

export function useQATestRuns() {
  const { toast } = useToast();
  const [runs, setRuns] = useState<QATestRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [results, setResults] = useState<QATestResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRuns = useCallback(async () => {
    const { data, error } = await supabase
      .from("qa_test_runs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading runs", description: error.message, variant: "destructive" });
      return;
    }
    // Cast snapshot_test_ids from jsonb
    const parsed: QATestRun[] = (data || []).map((r: any) => ({
      ...r,
      snapshot_test_ids: Array.isArray(r.snapshot_test_ids) ? r.snapshot_test_ids : null,
    }));
    setRuns(parsed);
    if (!activeRunId || !parsed.find((r) => r.id === activeRunId)) {
      const inProgress = parsed.find((r) => r.status === "in_progress");
      setActiveRunId(inProgress?.id || parsed[0]?.id || null);
    }
  }, [activeRunId, toast]);

  const loadResults = useCallback(async (runId: string) => {
    const { data, error } = await supabase
      .from("qa_test_results")
      .select("*")
      .eq("run_id", runId);
    if (error) {
      toast({ title: "Error loading results", description: error.message, variant: "destructive" });
      return;
    }
    setResults(data || []);
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    loadRuns().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeRunId) loadResults(activeRunId);
    else setResults([]);
  }, [activeRunId, loadResults]);

  const createRun = async (buildLabel: string, buildTimestamp: string, notes?: string, snapshotTestIds?: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("qa_test_runs").insert({
      build_label: buildLabel,
      build_timestamp: buildTimestamp,
      notes: notes || null,
      created_by: user.id,
      snapshot_test_ids: snapshotTestIds || null,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Run created" });
    await loadRuns();
  };

  const completeRun = async (runId: string) => {
    const { error } = await supabase
      .from("qa_test_runs")
      .update({ status: "completed" })
      .eq("id", runId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await loadRuns();
  };

  const upsertResult = async (
    runId: string,
    testCaseId: string,
    result: string,
    failureNotes?: string | null
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("qa_test_results").upsert(
      {
        run_id: runId,
        test_case_id: testCaseId,
        result,
        failure_notes: failureNotes ?? null,
        tested_by: user.id,
      },
      { onConflict: "run_id,test_case_id" }
    );
    if (error) {
      toast({ title: "Error saving result", description: error.message, variant: "destructive" });
      return;
    }
    await loadResults(runId);
  };

  const updateFailureNotes = async (runId: string, testCaseId: string, notes: string) => {
    const { error } = await supabase
      .from("qa_test_results")
      .update({ failure_notes: notes })
      .eq("run_id", runId)
      .eq("test_case_id", testCaseId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await loadResults(runId);
  };

  const fixRegression = async (runId: string, testCaseId: string) => {
    const { error } = await supabase
      .from("qa_test_results")
      .update({ regression_fixed_at: new Date().toISOString() })
      .eq("run_id", runId)
      .eq("test_case_id", testCaseId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await loadResults(runId);
  };

  const deleteResult = async (runId: string, testCaseId: string) => {
    const { error } = await supabase
      .from("qa_test_results")
      .delete()
      .eq("run_id", runId)
      .eq("test_case_id", testCaseId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await loadResults(runId);
  };

  const fixAllRegressions = async (runId: string) => {
    const { error } = await supabase
      .from("qa_test_results")
      .update({ regression_fixed_at: new Date().toISOString() })
      .eq("run_id", runId)
      .eq("result", "fail")
      .is("regression_fixed_at", null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "All regressions marked fixed" });
    await loadResults(runId);
  };

  const activeRun = runs.find((r) => r.id === activeRunId) || null;

  return {
    runs,
    activeRun,
    activeRunId,
    setActiveRunId,
    results,
    loading,
    createRun,
    completeRun,
    upsertResult,
    updateFailureNotes,
    fixRegression,
    deleteResult,
    fixAllRegressions,
    refresh: () => { loadRuns(); if (activeRunId) loadResults(activeRunId); },
  };
}
