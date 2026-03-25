import { useState, useEffect } from "react";
import { backgroundGenerator, GenerationJob } from "@/lib/backgroundGenerator";
import { Loader2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BackgroundJobsBanner() {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const update = () => setJobs(backgroundGenerator.getAllJobs());
    update();
    const unsub = backgroundGenerator.subscribe(update);
    return () => { unsub(); };
  }, []);

  // Clear dismissed entries when jobs complete
  useEffect(() => {
    const completedIds = jobs
      .filter((j) => ["complete", "error"].includes(j.status))
      .map((j) => j.applicationId);
    if (completedIds.length > 0) {
      setDismissed((prev) => {
        const next = new Set(prev);
        completedIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [jobs]);

  const activeJobs = jobs.filter(
    (j) => !["complete", "error"].includes(j.status) && !dismissed.has(j.applicationId)
  );

  if (activeJobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg shadow-xl max-w-sm w-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
          <span className="text-sm font-medium text-foreground">
            Generating Assets
          </span>
        </div>
        <button
          onClick={() => setDismissed((prev) => {
            const next = new Set(prev);
            activeJobs.forEach((j) => next.add(j.applicationId));
            return next;
          })}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
        {activeJobs.map((job) => {
          const company = job.companyName || "Application";
          const assets = job.generatingAssets || [];
          const currentAsset = job.currentAsset;

          return (
            <div key={job.applicationId} className="space-y-1.5">
              <p className="text-sm font-medium text-foreground truncate">
                {company}
              </p>
              {assets.length > 0 ? (
                <ul className="space-y-1">
                  {assets.map((asset) => {
                    const isDone = currentAsset
                      ? assets.indexOf(asset) < assets.indexOf(currentAsset)
                      : false;
                    const isActive = asset === currentAsset;

                    return (
                      <li
                        key={asset}
                        className={cn(
                          "flex items-center gap-2 text-xs",
                          isDone && "text-muted-foreground",
                          isActive && "text-foreground font-medium",
                          !isDone && !isActive && "text-muted-foreground"
                        )}
                      >
                        {isDone ? (
                          <Check className="h-3 w-3 text-green-500 shrink-0" />
                        ) : isActive ? (
                          <Loader2 className="h-3 w-3 animate-spin text-yellow-500 shrink-0" />
                        ) : (
                          <span className="h-3 w-3 shrink-0" />
                        )}
                        {asset}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">{job.progress}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
