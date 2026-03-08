import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ClipboardCopy, Clock, CheckCircle2, XCircle, MinusCircle, FlaskConical,
  Plus, Wrench, ChevronDown, Loader2, CheckCheck, History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  getAllTests, getAllAreas, getAllTags, getTestsByArea,
  getTotalEstimatedMinutes, type ManualTestCase,
} from "@/lib/qaRegistry";
import { useQATestRuns, type QATestResult } from "@/hooks/useQATestRuns";

type TestResult = "pass" | "fail" | "skip" | null;

export default function AdminQATab() {
  const { toast } = useToast();
  const qa = useQATestRuns();

  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [newBuildLabel, setNewBuildLabel] = useState("");
  const [newBuildTimestamp, setNewBuildTimestamp] = useState("");
  const [newRunNotes, setNewRunNotes] = useState("");
  const [fixAllConfirm, setFixAllConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const areas = useMemo(() => getAllAreas(), []);
  const tags = useMemo(() => getAllTags(), []);

  const filteredTests = useMemo(() => {
    let tests = areaFilter === "all" ? getAllTests() : getTestsByArea(areaFilter);
    if (tagFilter !== "all") tests = tests.filter((t) => t.tags.includes(tagFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      tests = tests.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.area.toLowerCase().includes(q) ||
          t.steps.some((s) => s.toLowerCase().includes(q))
      );
    }
    return tests;
  }, [areaFilter, tagFilter, search]);

  const groupedByArea = useMemo(() => {
    const map = new Map<string, ManualTestCase[]>();
    for (const t of filteredTests) {
      const list = map.get(t.area) || [];
      list.push(t);
      map.set(t.area, list);
    }
    return map;
  }, [filteredTests]);

  // Build a map of test_case_id -> QATestResult for the active run
  const resultMap = useMemo(() => {
    const m = new Map<string, QATestResult>();
    for (const r of qa.results) m.set(r.test_case_id, r);
    return m;
  }, [qa.results]);

  const totalMinutes = getTotalEstimatedMinutes(filteredTests);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const passCount = filteredTests.filter((t) => resultMap.get(t.id)?.result === "pass").length;
  const failCount = filteredTests.filter((t) => resultMap.get(t.id)?.result === "fail").length;
  const skipCount = filteredTests.filter((t) => resultMap.get(t.id)?.result === "skip").length;
  const openRegressions = filteredTests.filter(
    (t) => resultMap.get(t.id)?.result === "fail" && !resultMap.get(t.id)?.regression_fixed_at
  ).length;

  const handleSetResult = (testCaseId: string, result: TestResult) => {
    if (!qa.activeRunId || !result) return;
    qa.upsertResult(qa.activeRunId, testCaseId, result);
  };

  const handleCreateRun = () => {
    if (!newBuildLabel.trim()) return;
    const ts = newBuildTimestamp ? new Date(newBuildTimestamp).toISOString() : new Date().toISOString();
    qa.createRun(newBuildLabel.trim(), ts, newRunNotes.trim() || undefined);
    setNewRunOpen(false);
    setNewBuildLabel("");
    setNewBuildTimestamp("");
    setNewRunNotes("");
  };

  const pastRuns = qa.runs.filter((r) => r.id !== qa.activeRunId);

  if (qa.loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Run Management Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" /> Manual QA Suite
            </CardTitle>
            <Button size="sm" onClick={() => setNewRunOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Test Run
            </Button>
          </div>
          {qa.activeRun ? (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Select value={qa.activeRunId || ""} onValueChange={qa.setActiveRunId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select run" />
                </SelectTrigger>
                <SelectContent>
                  {qa.runs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.build_label} {r.status === "completed" ? "✓" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant={qa.activeRun.status === "completed" ? "default" : "secondary"}>
                {qa.activeRun.status === "completed" ? "Completed" : "In Progress"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(qa.activeRun.build_timestamp), "MMM d, yyyy HH:mm")}
              </span>
              {qa.activeRun.status === "in_progress" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => qa.completeRun(qa.activeRun!.id)}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark Complete
                </Button>
              )}
            </div>
          ) : (
            <CardDescription>No test runs yet. Create one to start tracking.</CardDescription>
          )}
        </CardHeader>
        {qa.activeRun && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 text-sm">
              <span>{filteredTests.length} tests · ~{hours}h {mins}m</span>
              <span className="text-green-600 dark:text-green-400">{passCount} pass</span>
              <span className="text-destructive">{failCount} fail</span>
              <span className="text-muted-foreground">{skipCount} skip</span>
              {openRegressions > 0 && (
                <span className="text-amber-600 dark:text-amber-400">{openRegressions} open regressions</span>
              )}
              {openRegressions > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFixAllConfirm(true)}
                >
                  <Wrench className="h-3.5 w-3.5 mr-1" /> Fix All Regressions
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => copyAsMarkdown(filteredTests, groupedByArea, resultMap, toast)} className="ml-auto">
                <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Copy as Markdown
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Test cases */}
      {qa.activeRun && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All areas</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search tests…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-52"
              />
            </div>

            <Accordion type="multiple" defaultValue={[...groupedByArea.keys()]}>
              {[...groupedByArea.entries()].map(([area, tests]) => (
                <AccordionItem key={area} value={area}>
                  <AccordionTrigger className="text-sm font-semibold">
                    {area}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {tests.length} tests · {getTotalEstimatedMinutes(tests)}m
                    </Badge>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {tests.map((tc) => (
                        <TestCaseCard
                          key={tc.id}
                          testCase={tc}
                          savedResult={resultMap.get(tc.id) || null}
                          runId={qa.activeRunId!}
                          onResult={(r) => handleSetResult(tc.id, r)}
                          onUpdateNotes={(notes) =>
                            qa.updateFailureNotes(qa.activeRunId!, tc.id, notes)
                          }
                          onFixRegression={() =>
                            qa.fixRegression(qa.activeRunId!, tc.id)
                          }
                          isCompleted={qa.activeRun?.status === "completed"}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {filteredTests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No tests match the current filters.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Previous Runs */}
      {pastRuns.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Previous Runs ({pastRuns.length})
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {pastRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => qa.setActiveRunId(run.id)}
              >
                <div>
                  <span className="font-medium text-sm">{run.build_label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {format(new Date(run.build_timestamp), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
                <Badge variant={run.status === "completed" ? "default" : "secondary"} className="text-xs">
                  {run.status === "completed" ? "Completed" : "In Progress"}
                </Badge>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* New Run Dialog */}
      <Dialog open={newRunOpen} onOpenChange={setNewRunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Test Run</DialogTitle>
            <DialogDescription>Create a test run tied to a specific build.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Build Label</Label>
              <Input
                placeholder='e.g. "v2.4 - Sprint 12"'
                value={newBuildLabel}
                onChange={(e) => setNewBuildLabel(e.target.value)}
              />
            </div>
            <div>
              <Label>Build Timestamp</Label>
              <Input
                type="datetime-local"
                value={newBuildTimestamp}
                onChange={(e) => setNewBuildTimestamp(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Match the timestamp from Lovable version history</p>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="What changed in this build?"
                value={newRunNotes}
                onChange={(e) => setNewRunNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRunOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRun} disabled={!newBuildLabel.trim()}>Create Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fix All Regressions Confirm */}
      <AlertDialog open={fixAllConfirm} onOpenChange={setFixAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fix All Regressions</AlertDialogTitle>
            <AlertDialogDescription>
              Mark all {openRegressions} open failed tests in this run as fixed? This records that regressions have been addressed in a subsequent build.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (qa.activeRunId) qa.fixAllRegressions(qa.activeRunId);
                setFixAllConfirm(false);
              }}
            >
              Fix All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Individual Test Case Card ─── */

function TestCaseCard({
  testCase: tc,
  savedResult,
  runId,
  onResult,
  onUpdateNotes,
  onFixRegression,
  isCompleted,
}: {
  testCase: ManualTestCase;
  savedResult: QATestResult | null;
  runId: string;
  onResult: (r: TestResult) => void;
  onUpdateNotes: (notes: string) => void;
  onFixRegression: () => void;
  isCompleted?: boolean;
}) {
  const result = (savedResult?.result as TestResult) || null;
  const isFailed = result === "fail";
  const isFixed = !!savedResult?.regression_fixed_at;
  const [notes, setNotes] = useState(savedResult?.failure_notes || "");
  const [fixConfirm, setFixConfirm] = useState(false);

  // Sync notes from DB
  const dbNotes = savedResult?.failure_notes || "";
  if (dbNotes !== notes && !isFailed) {
    // Reset when result changes away from fail
  }

  return (
    <div className={`rounded-lg border p-3 space-y-2 transition-colors ${isFixed ? "border-green-500/30 bg-green-50/5" : "border-border hover:bg-muted/30"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${isFixed ? "line-through text-muted-foreground" : ""}`}>
              {tc.title}
            </span>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {tc.estimatedMinutes}m
            </Badge>
            {isFixed && (
              <Badge className="text-xs bg-green-600 text-white">Fixed</Badge>
            )}
            {tc.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>
          {tc.route && (
            <span className="text-xs text-muted-foreground font-mono">{tc.route}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isFailed && !isFixed && !isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-amber-600"
              title="Fix Regression"
              onClick={() => setFixConfirm(true)}
            >
              <Wrench className="h-4 w-4" />
            </Button>
          )}
          {!isCompleted && (
            <>
              <Button
                variant={result === "pass" ? "default" : "ghost"}
                size="sm"
                className={result === "pass" ? "bg-green-600 hover:bg-green-700 text-white h-7 w-7 p-0" : "h-7 w-7 p-0 text-muted-foreground"}
                onClick={() => onResult("pass")}
                title="Pass"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                variant={result === "fail" ? "default" : "ghost"}
                size="sm"
                className={result === "fail" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground h-7 w-7 p-0" : "h-7 w-7 p-0 text-muted-foreground"}
                onClick={() => onResult("fail")}
                title="Fail"
              >
                <XCircle className="h-4 w-4" />
              </Button>
              <Button
                variant={result === "skip" ? "default" : "ghost"}
                size="sm"
                className={result === "skip" ? "bg-muted text-muted-foreground h-7 w-7 p-0" : "h-7 w-7 p-0 text-muted-foreground"}
                onClick={() => onResult("skip")}
                title="Skip"
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {isCompleted && result && (
            <Badge
              variant={result === "pass" ? "default" : result === "fail" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {result}
            </Badge>
          )}
        </div>
      </div>

      {/* Failure notes textarea */}
      {isFailed && (
        <div className="space-y-1">
          <Textarea
            placeholder="Describe what went wrong…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdateNotes(notes)}
            rows={2}
            className={`text-xs ${isFixed ? "line-through text-muted-foreground" : ""}`}
            disabled={isCompleted}
          />
        </div>
      )}

      {tc.preconditions && tc.preconditions.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          <strong>Preconditions:</strong> {tc.preconditions.join("; ")}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div>
          <p className="font-medium text-muted-foreground mb-1">Steps</p>
          <ol className="list-decimal list-inside space-y-0.5 text-foreground/80">
            {tc.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
        <div>
          <p className="font-medium text-muted-foreground mb-1">Expected Results</p>
          <ul className="list-disc list-inside space-y-0.5 text-foreground/80">
            {tc.expectedResults.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Fix regression confirm */}
      <AlertDialog open={fixConfirm} onOpenChange={setFixConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Regression as Fixed?</AlertDialogTitle>
            <AlertDialogDescription>
              This records that "{tc.title}" has been fixed in a subsequent build.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onFixRegression();
                setFixConfirm(false);
              }}
            >
              Mark Fixed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Markdown Export ─── */

function copyAsMarkdown(
  filteredTests: ManualTestCase[],
  groupedByArea: Map<string, ManualTestCase[]>,
  resultMap: Map<string, QATestResult>,
  toast: any
) {
  const passCount = filteredTests.filter((t) => resultMap.get(t.id)?.result === "pass").length;
  const failCount = filteredTests.filter((t) => resultMap.get(t.id)?.result === "fail").length;
  const skipCount = filteredTests.filter((t) => resultMap.get(t.id)?.result === "skip").length;
  const untestedCount = filteredTests.length - passCount - failCount - skipCount;
  const totalMinutes = getTotalEstimatedMinutes(filteredTests);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const lines: string[] = [
    `# Manual QA Test Suite`,
    ``,
    `**Total tests:** ${filteredTests.length} | **Estimated time:** ${hours}h ${mins}m`,
    `**Results:** ✅ ${passCount} passed · ❌ ${failCount} failed · ⏭ ${skipCount} skipped · ⬜ ${untestedCount} untested`,
    ``,
  ];
  for (const [area, tests] of groupedByArea) {
    lines.push(`## ${area}`, ``);
    for (const t of tests) {
      const r = resultMap.get(t.id);
      const result = r?.result;
      const icon = result === "pass" ? "✅" : result === "fail" ? "❌" : result === "skip" ? "⏭" : "⬜";
      const fixed = r?.regression_fixed_at ? " (FIXED)" : "";
      lines.push(`### ${icon} ${t.title}${fixed}`);
      if (result === "fail" && r?.failure_notes) {
        lines.push(`**Failure Notes:** ${r.failure_notes}`);
      }
      if (t.preconditions?.length) lines.push(`**Preconditions:** ${t.preconditions.join("; ")}`);
      lines.push(`**Steps:**`);
      t.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
      lines.push(`**Expected:**`);
      t.expectedResults.forEach((e) => lines.push(`- ${e}`));
      lines.push(`**Tags:** ${t.tags.join(", ")} | **Est:** ${t.estimatedMinutes}m`, ``);
    }
  }
  navigator.clipboard.writeText(lines.join("\n"));
  toast({ title: "Copied", description: "QA suite copied as Markdown." });
}
