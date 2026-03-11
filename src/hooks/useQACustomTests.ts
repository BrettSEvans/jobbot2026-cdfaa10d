import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { registerTest, type ManualTestCase } from "@/lib/qaRegistry";

export interface QACustomTest {
  id: string;
  test_id: string;
  title: string;
  area: string;
  route: string | null;
  preconditions: string[];
  steps: string[];
  expected_results: string[];
  tags: string[];
  estimated_minutes: number;
  requires_auth: boolean;
  requires_admin: boolean;
  created_by: string;
  created_at: string;
}

/** Tracks which custom test_ids have already been registered in the in-memory registry */
const registeredCustomIds = new Set<string>();

export function useQACustomTests() {
  const { toast } = useToast();
  const [customTests, setCustomTests] = useState<QACustomTest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomTests = useCallback(async () => {
    const { data, error } = await supabase
      .from("qa_custom_tests")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Error loading custom tests", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const tests = (data || []) as QACustomTest[];
    setCustomTests(tests);

    // Register any new custom tests into the in-memory registry
    for (const ct of tests) {
      if (!registeredCustomIds.has(ct.test_id)) {
        registerTest({
          id: ct.test_id,
          title: ct.title,
          area: ct.area,
          route: ct.route || undefined,
          preconditions: ct.preconditions || [],
          steps: ct.steps || [],
          expectedResults: ct.expected_results || [],
          tags: ct.tags || [],
          estimatedMinutes: ct.estimated_minutes,
          requiresAuth: ct.requires_auth,
          requiresAdmin: ct.requires_admin,
        });
        registeredCustomIds.add(ct.test_id);
      }
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadCustomTests();
  }, []);

  const addCustomTest = async (test: Omit<ManualTestCase, "id"> & { id?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const testId = test.id || `qa-custom-${Date.now()}`;
    const { error } = await supabase.from("qa_custom_tests").insert({
      test_id: testId,
      title: test.title,
      area: test.area || "Custom",
      route: test.route || null,
      preconditions: test.preconditions || [],
      steps: test.steps,
      expected_results: test.expectedResults,
      tags: test.tags || [],
      estimated_minutes: test.estimatedMinutes || 3,
      requires_auth: test.requiresAuth ?? true,
      requires_admin: test.requiresAdmin ?? false,
      created_by: user.id,
    } as any);

    if (error) {
      toast({ title: "Error adding test", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Custom test added" });
    await loadCustomTests();
    return true;
  };

  const deleteCustomTest = async (testId: string) => {
    const { error } = await supabase
      .from("qa_custom_tests")
      .delete()
      .eq("test_id", testId);
    if (error) {
      toast({ title: "Error deleting test", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Custom test deleted" });
    await loadCustomTests();
  };

  return { customTests, loading, addCustomTest, deleteCustomTest, refresh: loadCustomTests };
}
