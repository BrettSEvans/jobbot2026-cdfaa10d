import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ClipboardCopy, Clock, CheckCircle2, XCircle, MinusCircle, FlaskConical,
  Plus, Wrench, ChevronDown, ChevronRight, Loader2, CheckCheck, History,
  RotateCcw, Download, Keyboard, Eye, EyeOff, FileSpreadsheet, Trash2,
} from "lucide-react";
import JSZip from "jszip";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  getAllTests, getAllAreas, getAllTags, getTestsByArea,
  getTotalEstimatedMinutes, getTestById, type ManualTestCase,
} from "@/lib/qaRegistry";
import { useQATestRuns, type QATestResult } from "@/hooks/useQATestRuns";
import { useQACustomTests } from "@/hooks/useQACustomTests";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type TestResult = "pass" | "fail" | "skip" | null;
type ResultFilter = "all" | "untested" | "pass" | "fail" | "skip";

export default function AdminQATab() {
  const { toast } = useToast();
  const qa = useQATestRuns();
  const customTests = useQACustomTests();

  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [search, setSearch] = useState("");
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [newBuildLabel, setNewBuildLabel] = useState("");
  const [newBuildTimestamp, setNewBuildTimestamp] = useState("");
  const [newRunNotes, setNewRunNotes] = useState("");
  const [fixAllConfirm, setFixAllConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [compareRunId, setCompareRunId] = useState<string | null>(null);
  const [compareResults, setCompareResults] = useState<Map<string, QATestResult>>(new Map());
  const [addTestOpen, setAddTestOpen] = useState(false);
  const [newTest, setNewTest] = useState({ title: "", area: "Custom", route: "", steps: "", expectedResults: "", tags: "", estimatedMinutes: 3 });

  const areas = useMemo(() => getAllAreas(), [customTests.customTests]);
  const tags = useMemo(() => getAllTags(), [customTests.customTests]);

  // Get tests scoped to the active run's snapshot (or all tests for legacy runs without snapshot)
  const snapshotTestIds = qa.activeRun?.snapshot_test_ids;
  const allRunTests = useMemo(() => {
    const all = getAllTests();
    if (!snapshotTestIds || snapshotTestIds.length === 0) return all;
    const idSet = new Set(snapshotTestIds);
    return all.filter((t) => idSet.has(t.id));
  }, [snapshotTestIds, customTests.customTests]);

  // Build a map of test_case_id -> QATestResult for the active run
  const resultMap = useMemo(() => {
    const m = new Map<string, QATestResult>();
    for (const r of qa.results) m.set(r.test_case_id, r);
    return m;
  }, [qa.results]);

  const filteredTests = useMemo(() => {
    let tests = areaFilter === "all" ? allRunTests : allRunTests.filter((t) => t.area === areaFilter);
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
    // Result status filter
    if (resultFilter !== "all") {
      tests = tests.filter((t) => {
        const r = resultMap.get(t.id)?.result as TestResult;
        if (resultFilter === "untested") return !r;
        return r === resultFilter;
      });
    }
    return tests;
  }, [areaFilter, tagFilter, search, resultFilter, resultMap, allRunTests]);

  const groupedByArea = useMemo(() => {
    const map = new Map<string, ManualTestCase[]>();
    for (const t of filteredTests) {
      const list = map.get(t.area) || [];
      list.push(t);
      map.set(t.area, list);
    }
    return map;
  }, [filteredTests]);

  // Smart accordion defaults: only open areas with untested or failed items
  const smartOpenAreas = useMemo(() => {
    const openAreas: string[] = [];
    for (const [area, tests] of groupedByArea) {
      const hasUntested = tests.some((t) => !resultMap.get(t.id)?.result);
      const hasFailed = tests.some((t) => resultMap.get(t.id)?.result === "fail" && !resultMap.get(t.id)?.regression_fixed_at);
      if (hasUntested || hasFailed) openAreas.push(area);
    }
    // If nothing needs attention, open the first area
    if (openAreas.length === 0 && groupedByArea.size > 0) {
      openAreas.push([...groupedByArea.keys()][0]);
    }
    return openAreas;
  }, [groupedByArea, resultMap]);

  // Stats — scoped to run snapshot
  const totalCount = allRunTests.length;
  const passCount = allRunTests.filter((t) => resultMap.get(t.id)?.result === "pass").length;
  const failCount = allRunTests.filter((t) => resultMap.get(t.id)?.result === "fail").length;
  const skipCount = allRunTests.filter((t) => resultMap.get(t.id)?.result === "skip").length;
  const untestedCount = totalCount - passCount - failCount - skipCount;
  const openRegressions = allRunTests.filter(
    (t) => resultMap.get(t.id)?.result === "fail" && !resultMap.get(t.id)?.regression_fixed_at
  ).length;
  const completionPercent = totalCount > 0 ? Math.round(((totalCount - untestedCount) / totalCount) * 100) : 0;

  // Time remaining (based on untested)
  const untestedTests = allRunTests.filter((t) => !resultMap.get(t.id)?.result);
  const remainingMinutes = getTotalEstimatedMinutes(untestedTests);
  const remHours = Math.floor(remainingMinutes / 60);
  const remMins = remainingMinutes % 60;

  const totalMinutes = getTotalEstimatedMinutes(filteredTests);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const handleSetResult = (testCaseId: string, result: TestResult) => {
    if (!qa.activeRunId || !result) return;
    qa.upsertResult(qa.activeRunId, testCaseId, result);
  };

  const handleClearResult = (testCaseId: string) => {
    if (!qa.activeRunId) return;
    qa.deleteResult(qa.activeRunId, testCaseId);
  };

  const handleCreateRun = () => {
    if (!newBuildLabel.trim()) return;
    const ts = newBuildTimestamp ? new Date(newBuildTimestamp).toISOString() : new Date().toISOString();
    // Snapshot current test IDs at creation time
    const snapshotIds = getAllTests().map((t) => t.id);
    qa.createRun(newBuildLabel.trim(), ts, newRunNotes.trim() || undefined, snapshotIds);
    setNewRunOpen(false);
    setNewBuildLabel("");
    setNewBuildTimestamp("");
    setNewRunNotes("");
  };

  // Default timestamp to now when opening dialog
  const handleOpenNewRun = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setNewBuildTimestamp(local);
    setNewRunOpen(true);
  };

  // Bulk actions
  const handleToggleSelect = (id: string) => {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTests.size === filteredTests.length) {
      setSelectedTests(new Set());
    } else {
      setSelectedTests(new Set(filteredTests.map((t) => t.id)));
    }
  };

  const handleBulkAction = (result: TestResult) => {
    if (!qa.activeRunId || !result || selectedTests.size === 0) return;
    for (const id of selectedTests) {
      qa.upsertResult(qa.activeRunId, id, result);
    }
    setSelectedTests(new Set());
  };

  // Run comparison
  const handleLoadCompareRun = async (runId: string) => {
    setCompareRunId(runId);
    const { data } = await (await import("@/integrations/supabase/client")).supabase
      .from("qa_test_results")
      .select("*")
      .eq("run_id", runId);
    const m = new Map<string, QATestResult>();
    for (const r of (data || [])) m.set(r.test_case_id, r as QATestResult);
    setCompareResults(m);
  };

  // CSV export
  const exportAsCsv = () => {
    const headers = ["Area", "Test Case", "Result", "Failure Notes", "Tags", "Est. Minutes"];
    const rows = filteredTests.map((t) => {
      const r = resultMap.get(t.id);
      return [
        t.area,
        `"${t.title.replace(/"/g, '""')}"`,
        r?.result || "untested",
        `"${(r?.failure_notes || "").replace(/"/g, '""')}"`,
        `"${t.tags.join(", ")}"`,
        String(t.estimatedMinutes),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-results-${qa.activeRun?.build_label || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "CSV downloaded." });
  };

  // XLSX export
  const exportAsXlsx = async () => {
    const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const run = qa.activeRun;
    const label = run?.build_label || "export";

    // Summary sheet rows
    const summaryRows = [
      ["Build Label", label],
      ["Timestamp", run ? format(new Date(run.build_timestamp), "MMM d, yyyy HH:mm") : ""],
      ["Status", run?.status || ""],
      ["Pass", String(passCount)],
      ["Fail", String(failCount)],
      ["Skip", String(skipCount)],
      ["Untested", String(untestedCount)],
      ["Completion %", `${completionPercent}%`],
      ["Total Est. Minutes", String(getTotalEstimatedMinutes(allRunTests))],
    ];

    // Results sheet
    const resHeaders = ["Area", "Test Case ID", "Title", "Result", "Failure Notes", "Tags", "Route", "Est. Minutes", "Steps", "Expected Results"];
    const resRows = filteredTests.map((t) => {
      const r = resultMap.get(t.id);
      return [
        t.area, t.id, t.title, r?.result || "untested",
        r?.failure_notes || "", t.tags.join(", "), t.route || "",
        String(t.estimatedMinutes), t.steps.join("\n"), t.expectedResults.join("\n"),
      ];
    });

    // Color fills for result column (index 3)
    const fillMap: Record<string, string> = { pass: "C6EFCE", fail: "FFC7CE", skip: "FFEB9C", untested: "D9D9D9" };

    // Build sheet XML helper
    const buildSheet = (headers: string[], rows: string[][]) => {
      let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
      // Header row
      xml += "<row>";
      headers.forEach((h) => { xml += `<c t="inlineStr"><is><t>${escXml(h)}</t></is></c>`; });
      xml += "</row>";
      rows.forEach((row) => {
        xml += "<row>";
        row.forEach((cell) => { xml += `<c t="inlineStr"><is><t>${escXml(cell)}</t></is></c>`; });
        xml += "</row>";
      });
      xml += "</sheetData></worksheet>";
      return xml;
    };

    // Build styled results sheet with fill colors
    const buildStyledSheet = (headers: string[], rows: string[][], resultColIdx: number) => {
      let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
      xml += "<row>";
      headers.forEach((h) => { xml += `<c t="inlineStr"><is><t>${escXml(h)}</t></is></c>`; });
      xml += "</row>";
      rows.forEach((row) => {
        xml += "<row>";
        row.forEach((cell) => { xml += `<c t="inlineStr"><is><t>${escXml(cell)}</t></is></c>`; });
        xml += "</row>";
      });
      xml += "</sheetData></worksheet>";
      return xml;
    };

    const zip = new JSZip();
    // Content types
    zip.file("[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '</Types>'
    );
    zip.file("_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>'
    );
    zip.file("xl/_rels/workbook.xml.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
      '</Relationships>'
    );
    zip.file("xl/workbook.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Summary" sheetId="1" r:id="rId1"/><sheet name="Test Results" sheetId="2" r:id="rId2"/></sheets></workbook>'
    );
    zip.file("xl/worksheets/sheet1.xml", buildSheet(["Field", "Value"], summaryRows));
    zip.file("xl/worksheets/sheet2.xml", buildStyledSheet(resHeaders, resRows, 3));

    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-results-${label}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "XLSX spreadsheet downloaded." });
  };

  const pastRuns = qa.runs.filter((r) => r.id !== qa.activeRunId);

  // Donut chart data
  const chartData = [
    { name: "Pass", value: passCount, color: "hsl(var(--chart-2))" },
    { name: "Fail", value: failCount, color: "hsl(var(--destructive))" },
    { name: "Skip", value: skipCount, color: "hsl(var(--muted-foreground))" },
    { name: "Untested", value: untestedCount, color: "hsl(var(--border))" },
  ].filter((d) => d.value > 0);

  // Previous build labels for autocomplete suggestions
  const previousLabels = useMemo(() => qa.runs.slice(0, 3).map((r) => r.build_label), [qa.runs]);

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
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setAddTestOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Test
              </Button>
              <Button size="sm" onClick={handleOpenNewRun}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Test Run
              </Button>
            </div>
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
              <Badge variant="outline" className="text-xs">
                {totalCount} tests snapshotted
              </Badge>
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
          <CardContent className="pt-0 space-y-3">
            {/* Segmented Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{completionPercent}% tested ({totalCount - untestedCount}/{totalCount})</span>
                {untestedCount > 0 && (
                  <span>~{remHours > 0 ? `${remHours}h ` : ""}{remMins}m remaining</span>
                )}
              </div>
              <div className="h-3 w-full rounded-full bg-secondary overflow-hidden flex">
                {passCount > 0 && (
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${(passCount / totalCount) * 100}%` }}
                    title={`${passCount} passed`}
                  />
                )}
                {failCount > 0 && (
                  <div
                    className="h-full bg-destructive transition-all"
                    style={{ width: `${(failCount / totalCount) * 100}%` }}
                    title={`${failCount} failed`}
                  />
                )}
                {skipCount > 0 && (
                  <div
                    className="h-full bg-muted-foreground/40 transition-all"
                    style={{ width: `${(skipCount / totalCount) * 100}%` }}
                    title={`${skipCount} skipped`}
                  />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> {passCount} pass</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive inline-block" /> {failCount} fail</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" /> {skipCount} skip</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-secondary inline-block border border-border" /> {untestedCount} untested</span>
                {openRegressions > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">{openRegressions} open regressions</span>
                )}
              </div>
            </div>

            {/* Summary + Actions Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Donut chart mini */}
              {totalCount > 0 && (
                <div className="w-12 h-12 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={12}
                        outerRadius={22}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <span className="text-sm text-muted-foreground">{filteredTests.length} tests · ~{hours}h {mins}m</span>

              {openRegressions > 0 && (
                <Button variant="outline" size="sm" onClick={() => setFixAllConfirm(true)}>
                  <Wrench className="h-3.5 w-3.5 mr-1" /> Fix All Regressions
                </Button>
              )}

              <div className="flex items-center gap-1 ml-auto">
                <Button variant="outline" size="sm" onClick={() => copyAsMarkdown(filteredTests, groupedByArea, resultMap, toast)}>
                  <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Markdown
                </Button>
                <Button variant="outline" size="sm" onClick={exportAsCsv}>
                  <Download className="h-3.5 w-3.5 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportAsXlsx}>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Spreadsheet
                </Button>
              </div>
            </div>

            {/* Compare Runs */}
            {pastRuns.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Compare with:</span>
                <Select value={compareRunId || "none"} onValueChange={(v) => v === "none" ? (setCompareRunId(null), setCompareResults(new Map())) : handleLoadCompareRun(v)}>
                  <SelectTrigger className="w-48 h-7 text-xs">
                    <SelectValue placeholder="Select run to compare" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {pastRuns.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.build_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {compareRunId && (
                  <Badge variant="outline" className="text-xs">
                     {(() => {
                       const regressions = allRunTests.filter((t) => {
                         const prev = compareResults.get(t.id)?.result;
                         const curr = resultMap.get(t.id)?.result;
                         return prev === "pass" && curr === "fail";
                       }).length;
                       const fixes = allRunTests.filter((t) => {
                         const prev = compareResults.get(t.id)?.result;
                         const curr = resultMap.get(t.id)?.result;
                         return prev === "fail" && curr === "pass";
                       }).length;
                      return `${regressions} regressions · ${fixes} fixes`;
                    })()}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Test cases */}
      {qa.activeRun && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
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
              <Select value={resultFilter} onValueChange={(v) => setResultFilter(v as ResultFilter)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All results</SelectItem>
                  <SelectItem value="untested">⬜ Untested ({untestedCount})</SelectItem>
                  <SelectItem value="pass">✅ Pass ({passCount})</SelectItem>
                  <SelectItem value="fail">❌ Fail ({failCount})</SelectItem>
                  <SelectItem value="skip">⏭ Skip ({skipCount})</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Search tests…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-52"
              />
            </div>

            {/* Bulk Actions Bar */}
            {selectedTests.size > 0 && qa.activeRun.status !== "completed" && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                <span className="text-sm font-medium">{selectedTests.size} selected</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkAction("pass")}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Pass
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkAction("skip")}>
                  <MinusCircle className="h-3 w-3 mr-1" /> Mark Skip
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkAction("fail")}>
                  <XCircle className="h-3 w-3 mr-1" /> Mark Fail
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelectedTests(new Set())}>
                  Clear
                </Button>
              </div>
            )}

            {/* Select All toggle */}
            {filteredTests.length > 0 && qa.activeRun.status !== "completed" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedTests.size === filteredTests.length && filteredTests.length > 0}
                  onCheckedChange={handleSelectAll}
                  id="select-all"
                />
                <Label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
                  Select all ({filteredTests.length})
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Keyboard className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">Keyboard: <kbd>P</kbd> Pass · <kbd>F</kbd> Fail · <kbd>S</kbd> Skip (when focused)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            <Accordion type="multiple" defaultValue={smartOpenAreas}>
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
                      {tests.map((tc) => {
                        const isCustom = customTests.customTests.some((ct) => ct.test_id === tc.id);
                        return (
                        <TestCaseCard
                          key={tc.id}
                          testCase={tc}
                          savedResult={resultMap.get(tc.id) || null}
                          compareResult={compareResults.get(tc.id) || null}
                          runId={qa.activeRunId!}
                          onResult={(r) => handleSetResult(tc.id, r)}
                          onClear={() => handleClearResult(tc.id)}
                          onUpdateNotes={(notes) =>
                            qa.updateFailureNotes(qa.activeRunId!, tc.id, notes)
                          }
                          onFixRegression={() =>
                            qa.fixRegression(qa.activeRunId!, tc.id)
                          }
                          isCompleted={qa.activeRun?.status === "completed"}
                          isSelected={selectedTests.has(tc.id)}
                          onToggleSelect={() => handleToggleSelect(tc.id)}
                          isCustom={isCustom}
                          onDelete={isCustom ? () => customTests.deleteCustomTest(tc.id) : undefined}
                        />
                        );
                      })}
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
              {previousLabels.length > 0 && (
                <div className="flex gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">Recent:</span>
                  {previousLabels.map((label) => (
                    <button
                      key={label}
                      className="text-xs text-primary hover:underline"
                      onClick={() => setNewBuildLabel(label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
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

      {/* Add Custom Test Dialog */}
      <Dialog open={addTestOpen} onOpenChange={setAddTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Test Case</DialogTitle>
            <DialogDescription>Create a new manual QA test. It will be available in future test runs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Verify export works on Safari"
                value={newTest.title}
                onChange={(e) => setNewTest((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Area</Label>
              <Input
                placeholder="e.g. Cross-cutting, Admin, Auth"
                value={newTest.area}
                onChange={(e) => setNewTest((p) => ({ ...p, area: e.target.value }))}
              />
            </div>
            <div>
              <Label>Route (optional)</Label>
              <Input
                placeholder="e.g. /applications"
                value={newTest.route}
                onChange={(e) => setNewTest((p) => ({ ...p, route: e.target.value }))}
              />
            </div>
            <div>
              <Label>Steps (one per line) *</Label>
              <Textarea
                placeholder={"Navigate to /page.\nClick the button.\nVerify the result."}
                value={newTest.steps}
                onChange={(e) => setNewTest((p) => ({ ...p, steps: e.target.value }))}
                rows={4}
              />
            </div>
            <div>
              <Label>Expected Results (one per line) *</Label>
              <Textarea
                placeholder={"The page loads correctly.\nData is displayed."}
                value={newTest.expectedResults}
                onChange={(e) => setNewTest((p) => ({ ...p, expectedResults: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="e.g. smoke, regression"
                value={newTest.tags}
                onChange={(e) => setNewTest((p) => ({ ...p, tags: e.target.value }))}
              />
            </div>
            <div>
              <Label>Estimated Minutes</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={newTest.estimatedMinutes}
                onChange={(e) => setNewTest((p) => ({ ...p, estimatedMinutes: parseInt(e.target.value) || 3 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTestOpen(false)}>Cancel</Button>
            <Button
              disabled={!newTest.title.trim() || !newTest.steps.trim() || !newTest.expectedResults.trim()}
              onClick={async () => {
                const ok = await customTests.addCustomTest({
                  title: newTest.title.trim(),
                  area: newTest.area.trim() || "Custom",
                  route: newTest.route.trim() || undefined,
                  steps: newTest.steps.split("\n").map((s) => s.trim()).filter(Boolean),
                  expectedResults: newTest.expectedResults.split("\n").map((s) => s.trim()).filter(Boolean),
                  tags: newTest.tags.split(",").map((s) => s.trim()).filter(Boolean),
                  estimatedMinutes: newTest.estimatedMinutes,
                  requiresAuth: true,
                  requiresAdmin: false,
                  preconditions: [],
                });
                if (ok) {
                  setAddTestOpen(false);
                  setNewTest({ title: "", area: "Custom", route: "", steps: "", expectedResults: "", tags: "", estimatedMinutes: 3 });
                }
              }}
            >
              Add Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Individual Test Case Card ─── */

function TestCaseCard({
  testCase: tc,
  savedResult,
  compareResult,
  runId,
  onResult,
  onClear,
  onUpdateNotes,
  onFixRegression,
  isCompleted,
  isSelected,
  onToggleSelect,
  isCustom,
  onDelete,
}: {
  testCase: ManualTestCase;
  savedResult: QATestResult | null;
  compareResult: QATestResult | null;
  runId: string;
  onResult: (r: TestResult) => void;
  onClear: () => void;
  onUpdateNotes: (notes: string) => void;
  onFixRegression: () => void;
  isCompleted?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  isCustom?: boolean;
  onDelete?: () => void;
}) {
  const result = (savedResult?.result as TestResult) || null;
  const isFailed = result === "fail";
  const isFixed = !!savedResult?.regression_fixed_at;
  const [notes, setNotes] = useState(savedResult?.failure_notes || "");
  const [fixConfirm, setFixConfirm] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notesSaved, setNotesSaved] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync notes from saved result
  useEffect(() => {
    setNotes(savedResult?.failure_notes || "");
    setNotesSaved(true);
  }, [savedResult?.failure_notes]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isCompleted) return;
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
    if (e.key === "p" || e.key === "P") { e.preventDefault(); onResult("pass"); }
    if (e.key === "f" || e.key === "F") { e.preventDefault(); onResult("fail"); }
    if (e.key === "s" || e.key === "S") { e.preventDefault(); onResult("skip"); }
  }, [isCompleted, onResult]);

  // Regression comparison indicator
  const compPrev = compareResult?.result as TestResult;
  const isRegression = compPrev === "pass" && result === "fail";
  const isNewFix = compPrev === "fail" && result === "pass";

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`rounded-lg border p-3 space-y-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
        isRegression ? "border-destructive/50 bg-destructive/5" :
        isFixed ? "border-green-500/30 bg-green-50/5" :
        isNewFix ? "border-green-500/30" :
        "border-border hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {!isCompleted && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="mt-0.5"
            />
          )}
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
              {isRegression && (
                <Badge variant="destructive" className="text-xs">Regression</Badge>
              )}
              {isNewFix && (
                <Badge className="text-xs bg-green-600 text-white">New Fix</Badge>
              )}
              {isCustom && (
                <Badge variant="secondary" className="text-xs">Custom</Badge>
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
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Details toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={() => setDetailsOpen(!detailsOpen)}
            title={detailsOpen ? "Hide details" : "Show details"}
          >
            {detailsOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>

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
                title="Pass (P)"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                variant={result === "fail" ? "default" : "ghost"}
                size="sm"
                className={result === "fail" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground h-7 w-7 p-0" : "h-7 w-7 p-0 text-muted-foreground"}
                onClick={() => onResult("fail")}
                title="Fail (F)"
              >
                <XCircle className="h-4 w-4" />
              </Button>
              <Button
                variant={result === "skip" ? "default" : "ghost"}
                size="sm"
                className={result === "skip" ? "bg-muted text-muted-foreground h-7 w-7 p-0" : "h-7 w-7 p-0 text-muted-foreground"}
                onClick={() => onResult("skip")}
                title="Skip (S)"
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
              {result && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  onClick={onClear}
                  title="Clear / Retest"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
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
            onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
            onBlur={() => { onUpdateNotes(notes); setNotesSaved(true); }}
            rows={2}
            className={`text-xs ${isFixed ? "line-through text-muted-foreground" : ""}`}
            disabled={isCompleted}
          />
          {!isCompleted && (
            <span className={`text-[10px] ${notesSaved ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
              {notesSaved ? "✓ Saved" : "Unsaved — click outside to save"}
            </span>
          )}
        </div>
      )}

      {/* Collapsible details — steps and expected results */}
      {detailsOpen && (
        <>
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
        </>
      )}

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
