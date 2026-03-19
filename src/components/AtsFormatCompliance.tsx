import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { checkAtsFormatCompliance, type FormatComplianceResult } from "@/lib/atsFormatCheck";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react";

interface AtsFormatComplianceProps {
  resumeHtml: string;
}

export default function AtsFormatCompliance({ resumeHtml }: AtsFormatComplianceProps) {
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<FormatComplianceResult | null>(null);

  const runCheck = () => {
    const r = checkAtsFormatCompliance(resumeHtml);
    setResult(r);
    setExpanded(true);
  };

  const getScoreColor = (s: number) =>
    s >= 80 ? "text-green-600 dark:text-green-400" : s >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";

  const getScoreBg = (s: number) =>
    s >= 80 ? "bg-green-500" : s >= 60 ? "bg-yellow-500" : "bg-red-500";

  const severityIcon = (sev: string) => {
    if (sev === "error") return <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />;
    if (sev === "warning") return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />;
    return <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />;
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">ATS Format Compliance</span>
            {result && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getScoreBg(result.score)}`}
                    style={{ width: `${result.score}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${getScoreColor(result.score)}`}>
                  {result.score}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!result && (
              <Button size="sm" variant="outline" onClick={runCheck} disabled={!resumeHtml}>
                <ShieldCheck className="h-4 w-4" />
                <span className="ml-1">Check Format</span>
              </Button>
            )}
            {result && (
              <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && result && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-2">
                {result.checks.map((check, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2 rounded text-sm ${
                      check.passed ? "bg-muted/30" : "bg-destructive/5"
                    }`}
                  >
                    {check.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      severityIcon(check.severity)
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${check.passed ? "text-muted-foreground" : ""}`}>
                          {check.name}
                        </span>
                        {!check.passed && (
                          <Badge variant={check.severity === "error" ? "destructive" : "outline"} className="text-[10px]">
                            {check.severity}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                      {!check.passed && check.fix && (
                        <p className="text-xs text-primary mt-1">💡 {check.fix}</p>
                      )}
                    </div>
                  </div>
                ))}

                <Button size="sm" variant="ghost" onClick={runCheck} className="mt-2">
                  ↻ Re-check
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
