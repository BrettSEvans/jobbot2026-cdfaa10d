import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Layers, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DISMISSED_KEY = "jobbot_batch_prompt_dismissed";

interface BatchModePromptProps {
  applicationCount: number;
}

export default function BatchModePrompt({ applicationCount }: BatchModePromptProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  });

  if (dismissed || applicationCount < 2) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <Layers className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          Applying to multiple roles?
        </p>
        <p className="text-xs text-muted-foreground">
          Use batch mode to generate up to 10 applications at once — all run in the background.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate("/applications/new?tab=batch")}
        className="shrink-0"
      >
        Try Batch Mode
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDismiss}
        className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
