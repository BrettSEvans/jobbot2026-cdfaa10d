import { useState, useEffect } from "react";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function BackgroundJobsBanner() {
  const [activeCount, setActiveCount] = useState(backgroundGenerator.getActiveCount());
  const [parallelInfo, setParallelInfo] = useState<{ completed: number; total: number } | null>(null);
  const [assetJobLabels, setAssetJobLabels] = useState<string[]>([]);

  useEffect(() => {
    const unsub = backgroundGenerator.subscribe(() => {
      setActiveCount(backgroundGenerator.getActiveCount());
      // Check if any active job is in parallel phase
      const jobs = backgroundGenerator.getAllJobs();
      const parallelJob = jobs.find((j) => j.status === "generating-assets");
      if (parallelJob && parallelJob.parallelTotal) {
        setParallelInfo({ completed: parallelJob.parallelCompleted || 0, total: parallelJob.parallelTotal });
      } else {
        setParallelInfo(null);
      }
      // Collect asset job labels
      const labels = jobs
        .filter((j) => (j.status === "generating-asset" || j.status === "refining-asset") && j.jobLabel)
        .map((j) => j.jobLabel!);
      setAssetJobLabels(labels);
    });
    return () => { unsub(); };
  }, []);

  if (activeCount === 0) return null;

  const getLabel = () => {
    if (parallelInfo) {
      return `Generating assets... (${parallelInfo.completed}/${parallelInfo.total} completed)`;
    }
    if (assetJobLabels.length > 0) {
      return assetJobLabels.length === 1
        ? assetJobLabels[0]
        : `${assetJobLabels.length} asset jobs running`;
    }
    return `${activeCount} generation${activeCount > 1 ? "s" : ""} running in background`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{getLabel()}</span>
    </div>
  );
}