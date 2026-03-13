import { useState, useEffect } from "react";
import { backgroundGenerator } from "@/lib/backgroundGenerator";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function BackgroundJobsBanner() {
  const [activeCount, setActiveCount] = useState(backgroundGenerator.getActiveCount());
  const [parallelInfo, setParallelInfo] = useState<{ completed: number; total: number } | null>(null);

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
    });
    return () => { unsub(); };
  }, []);

  if (activeCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>
        {parallelInfo
          ? `Generating assets... (${parallelInfo.completed}/${parallelInfo.total} completed)`
          : `${activeCount} generation${activeCount > 1 ? "s" : ""} running in background`
        }
      </span>
    </div>
  );
}
