import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ClipboardCopy, Clock, CheckCircle2, XCircle, MinusCircle, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getAllTests,
  getAllAreas,
  getAllTags,
  getTestsByArea,
  getTotalEstimatedMinutes,
  type ManualTestCase,
} from "@/lib/qaRegistry";

type TestResult = "pass" | "fail" | "skip" | null;

export default function AdminQATab() {
  const { toast } = useToast();
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const areas = useMemo(() => getAllAreas(), []);
  const tags = useMemo(() => getAllTags(), []);

  const filteredTests = useMemo(() => {
    let tests = areaFilter === "all" ? getAllTests() : getTestsByArea(areaFilter);
    if (tagFilter !== "all") {
      tests = tests.filter((t) => t.tags.includes(tagFilter));
    }
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

  const totalMinutes = getTotalEstimatedMinutes(filteredTests);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const passCount = filteredTests.filter((t) => results[t.id] === "pass").length;
  const failCount = filteredTests.filter((t) => results[t.id] === "fail").length;
  const skipCount = filteredTests.filter((t) => results[t.id] === "skip").length;
  const untestedCount = filteredTests.length - passCount - failCount - skipCount;

  const setResult = (id: string, result: TestResult) => {
    setResults((prev) => ({ ...prev, [id]: prev[id] === result ? null : result }));
  };

  const copyAsMarkdown = () => {
    const lines: string[] = [
      `# Manual QA Test Suite`,
      ``,
      `**Total tests:** ${filteredTests.length} | **Estimated time:** ${hours}h ${mins}m`,
      `**Results:** ✅ ${passCount} passed · ❌ ${failCount} failed · ⏭ ${skipCount} skipped · ⬜ ${untestedCount} untested`,
      ``,
    ];
    for (const [area, tests] of groupedByArea) {
      lines.push(`## ${area}`);
      lines.push(``);
      for (const t of tests) {
        const r = results[t.id];
        const icon = r === "pass" ? "✅" : r === "fail" ? "❌" : r === "skip" ? "⏭" : "⬜";
        lines.push(`### ${icon} ${t.title}`);
        if (t.preconditions?.length) {
          lines.push(`**Preconditions:** ${t.preconditions.join("; ")}`);
        }
        lines.push(`**Steps:**`);
        t.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
        lines.push(`**Expected:**`);
        t.expectedResults.forEach((e) => lines.push(`- ${e}`));
        lines.push(`**Tags:** ${t.tags.join(", ")} | **Est:** ${t.estimatedMinutes}m`);
        lines.push(``);
      }
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copied", description: "QA suite copied as Markdown." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" /> Manual QA Suite
        </CardTitle>
        <CardDescription>
          {filteredTests.length} tests · ~{hours}h {mins}m estimated ·{" "}
          <span className="text-green-600 dark:text-green-400">{passCount} pass</span>{" "}
          <span className="text-destructive">{failCount} fail</span>{" "}
          <span className="text-muted-foreground">{skipCount} skip</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Button variant="outline" size="sm" onClick={copyAsMarkdown} className="ml-auto">
            <ClipboardCopy className="h-3.5 w-3.5 mr-1.5" /> Copy as Markdown
          </Button>
        </div>

        {/* Test cases by area */}
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
                      result={results[tc.id] ?? null}
                      onResult={(r) => setResult(tc.id, r)}
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
  );
}

function TestCaseCard({
  testCase: tc,
  result,
  onResult,
}: {
  testCase: ManualTestCase;
  result: TestResult;
  onResult: (r: TestResult) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{tc.title}</span>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {tc.estimatedMinutes}m
            </Badge>
            {tc.helpSlug && (
              <Badge variant="secondary" className="text-xs">
                help:{tc.helpSlug}
              </Badge>
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
        </div>
      </div>

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
    </div>
  );
}
